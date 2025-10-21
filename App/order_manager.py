from database import Database
from mysql.connector import Error
import json


ORDER_STATUSES = (
    "pending",
    "confirmed",
    "sent_to_kitchen",
    "processing",
    "completed",
    "cancelled",
    "served"
)

STATUS_TRANSITIONS = {
    "pending": {"confirmed", "cancelled"},
    "confirmed": {"sent_to_kitchen", "cancelled"},
    "sent_to_kitchen": {"processing", "cancelled"},
    "processing": {"completed", "cancelled"},
    "completed": {"served"},
    "served": set(),
    "cancelled": set()
}

STATUS_ALIASES = {
    "pending": "pending",
    "cho duyet": "pending",
    "cho xac nhan": "pending",
    "confirmed": "confirmed",
    "da xac nhan": "confirmed",
    "xac nhan": "confirmed",
    "sent_to_kitchen": "sent_to_kitchen",
    "gui bep": "sent_to_kitchen",
    "chua xu ly": "sent_to_kitchen",
    "processing": "processing",
    "dang xu ly": "processing",
    "in_progress": "processing",
    "completed": "completed",
    "hoan thanh": "completed",
    "done": "completed",
    "cancelled": "cancelled",
    "canceled": "cancelled",
    "da huy": "cancelled",
    "huy": "cancelled",
    "served": "served",
    "da phuc vu": "served"
}


class OrderManager:
    def __init__(self):
        try:
            self.db = Database()
        except Exception as e:
            print(f"Error initializing OrderManager: {e}")
            raise
        self.last_error = None
        self.last_assigned_table = None
        self.last_error_code = None

    def ensure_connection(self):
        self.db.reconnect_if_needed()

    def _normalize_status(self, status):
        if status is None:
            return None
        normalized = str(status).strip().lower()
        return STATUS_ALIASES.get(normalized, normalized)

    def _is_transition_allowed(self, current_status, new_status):
        if current_status == new_status:
            return True
        allowed = STATUS_TRANSITIONS.get(current_status, set())
        return new_status in allowed

    def _sanitize_bool(self, value):
        if value is None:
            return None
        if isinstance(value, bool):
            return value
        if isinstance(value, str):
            cleaned = value.strip().lower()
            if cleaned in {"1", "true", "yes", "y"}:
                return True
            if cleaned in {"0", "false", "no", "n"}:
                return False
        return bool(value)

    def _normalize_table_number(self, value):
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        digits = "".join(ch for ch in text if ch.isdigit())
        if digits:
            normalized_digits = digits.lstrip("0")
            return normalized_digits or "0"
        lowered = text.lower()
        for token in ("bàn", "ban", "table", "tbl", "#"):
            lowered = lowered.replace(token, "")
        lowered = "".join(ch for ch in lowered if not ch.isspace())
        return lowered or text

    def _table_lookup_key(self, value):
        if value is None:
            return None
        text = str(value).strip().lower()
        if not text:
            return None
        for token in ("bàn", "ban", "table", "tbl", "#"):
            text = text.replace(token, "")
        text = "".join(ch for ch in text if ch.isalnum())
        return text

    def _should_auto_assign_table(self, order_type):
        if order_type is None:
            return True
        normalized = str(order_type).strip().lower()
        if not normalized:
            return True
        dine_in_aliases = {"dine_in", "dine-in", "dinein", "eat_in", "eat-in", "tai_quan", "tai-quan", "onsite"}
        return normalized in dine_in_aliases

    def _reserve_table_for_order(self, order_id, requested_table=None, original_input=None):
        requested = self._normalize_table_number(requested_table)
        requested_key = self._table_lookup_key(original_input if original_input is not None else requested_table)
        cursor = self.db.conn.cursor(dictionary=True)
        try:
            table_row = None
            if requested:
                cursor.execute(
                    "SELECT id, table_number, display_name, is_occupied, current_order_id FROM dining_tables FOR UPDATE"
                )
                rows = cursor.fetchall()
                for row in rows:
                    number_key = self._table_lookup_key(row.get("table_number"))
                    display_key = self._table_lookup_key(row.get("display_name"))
                    if requested_key:
                        if number_key == requested_key or display_key == requested_key:
                            table_row = row
                            break
                    if row.get("table_number") == requested:
                        table_row = row
                        break
                if not table_row:
                    raise ValueError(f"Ban {requested_table or requested} khong ton tai")
                if table_row["is_occupied"] and table_row.get("current_order_id") not in (None, order_id):
                    raise ValueError(f"Ban {table_row.get('table_number')} da co nguoi")
            else:
                cursor.execute(
                    "SELECT id, table_number, display_name, is_occupied, current_order_id FROM dining_tables WHERE is_occupied = FALSE ORDER BY LENGTH(table_number), table_number ASC LIMIT 1 FOR UPDATE"
                )
                table_row = cursor.fetchone()
                if not table_row:
                    return None
            cursor.execute(
                "UPDATE dining_tables SET is_occupied = TRUE WHERE id = %s",
                (table_row["id"],)
            )
            return {
                "table_number": table_row["table_number"],
                "table_id": table_row["id"]
            }
        finally:
            cursor.close()

    def _finalize_table_assignment(self, table_id, order_id):
        if not table_id:
            return
        cursor = self.db.conn.cursor()
        try:
            cursor.execute(
                "UPDATE dining_tables SET current_order_id = %s WHERE id = %s",
                (order_id, table_id)
            )
        finally:
            cursor.close()

    def _release_table_by_id(self, table_id):
        if not table_id:
            return
        cursor = self.db.conn.cursor()
        try:
            cursor.execute(
                "UPDATE dining_tables SET is_occupied = FALSE, current_order_id = NULL WHERE id = %s",
                (table_id,)
            )
        finally:
            cursor.close()

    def _release_table_for_order(self, order_id):
        cursor = self.db.conn.cursor()
        try:
            cursor.execute(
                "UPDATE dining_tables SET is_occupied = FALSE, current_order_id = NULL WHERE current_order_id = %s",
                (order_id,)
            )
        finally:
            cursor.close()

    def _release_specific_table(self, table_number, order_id):
        normalized = self._normalize_table_number(table_number)
        if not normalized:
            return
        cursor = self.db.conn.cursor()
        try:
            cursor.execute(
                "UPDATE dining_tables SET is_occupied = FALSE, current_order_id = NULL WHERE table_number = %s AND current_order_id = %s",
                (normalized, order_id)
            )
        finally:
            cursor.close()

    def _validate_items(self, items):
        if not isinstance(items, list) or len(items) == 0:
            raise ValueError("Danh sach san pham phai la list va khong duoc rong")

        sanitized_items = []
        total_price = 0.0

        for index, item in enumerate(items, start=1):
            if not isinstance(item, dict):
                raise ValueError(f"Item thu {index} phai la dictionary")

            if "product_id" not in item or "quantity" not in item:
                raise ValueError(f"Item thu {index} phai co product_id va quantity")

            try:
                product_id = int(item["product_id"])
                quantity = int(item["quantity"])
            except (TypeError, ValueError):
                raise ValueError(f"product_id va quantity trong item thu {index} phai la so nguyen")

            if product_id <= 0 or quantity <= 0:
                raise ValueError(f"product_id va quantity trong item thu {index} phai lon hon 0")

            self.db.cursor.execute(
                "SELECT price FROM products WHERE id = %s",
                (product_id,)
            )
            product = self.db.cursor.fetchone()
            if not product:
                raise ValueError(f"San pham voi ID {product_id} khong ton tai")

            price = float(product[0])
            total_price += price * quantity

            selected_options = item.get("selected_options")
            if selected_options is not None:
                try:
                    json.dumps(selected_options)
                except (TypeError, ValueError):
                    raise ValueError(f"selected_options trong item thu {index} khong hop le")

            sanitized_items.append({
                "product_id": product_id,
                "quantity": quantity,
                "selected_options": selected_options
            })

        return sanitized_items, round(total_price, 2)

    def add_order(self, customer_name, items, total_price, status="pending",
                  order_type=None, payment_method=None, table_number=None,
                  needs_assistance=False, note=None, customer_email=None,
                  email_receipt=False, payment_status="unpaid"):
        self.last_error = None
        self.last_assigned_table = None
        reserved_table_info = None
        next_id = None
        try:
            self.ensure_connection()
            self.db.conn.start_transaction()

            if not customer_name or not str(customer_name).strip():
                raise ValueError("Ten khach hang khong duoc de trong")

            normalized_status = self._normalize_status(status or "pending") or "pending"
            if normalized_status not in ORDER_STATUSES:
                raise ValueError(f"Trang thai {status} khong hop le")
            if normalized_status == "served":
                raise ValueError("Khong the tao don hang o trang thai served")

            sanitized_items, computed_total = self._validate_items(items)

            total_price_value = computed_total
            if total_price is not None:
                try:
                    provided_total = float(total_price)
                    if abs(provided_total - computed_total) <= 0.01:
                        total_price_value = round(provided_total, 2)
                except (TypeError, ValueError):
                    total_price_value = computed_total

            next_id = self.db.get_next_id(table="orders")
            if next_id is None:
                raise Exception("Khong the tao ID don hang")

            normalized_table = self._normalize_table_number(table_number)
            requires_table = self._should_auto_assign_table(order_type)
            if normalized_table:
                reserved_table_info = self._reserve_table_for_order(
                    next_id,
                    normalized_table,
                    original_input=table_number
                )
            elif requires_table:
                reserved_table_info = self._reserve_table_for_order(next_id, None)
                if reserved_table_info is None:
                    raise ValueError("Khong con ban trong, vui long cho ban trong truoc khi tao don moi")

            table_value = reserved_table_info["table_number"] if reserved_table_info is not None else None

            needs_assistance_value = self._sanitize_bool(needs_assistance)
            email_receipt_value = self._sanitize_bool(email_receipt)
            if needs_assistance_value is None:
                needs_assistance_value = False
            if email_receipt_value is None:
                email_receipt_value = False
            payment_status_value = "paid" if str(payment_status).strip().lower() == "paid" else "unpaid"

            sql = '''INSERT INTO orders (id, customer_name, total_price, status,
                     order_type, payment_method, table_number, needs_assistance,
                     note, customer_email, email_receipt, payment_status)
                     VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)'''
            values = (
                next_id,
                str(customer_name).strip(),
                float(total_price_value),
                normalized_status,
                order_type,
                payment_method,
                table_value,
                needs_assistance_value,
                note,
                customer_email,
                email_receipt_value,
                payment_status_value
            )
            self.db.cursor.execute(sql, values)

            item_sql = '''INSERT INTO order_items (order_id, product_id, quantity, selected_options)
                          VALUES (%s, %s, %s, %s)'''
            item_values = []
            for item in sanitized_items:
                selected = item.get("selected_options")
                selected_json = json.dumps(selected) if selected is not None else None
                item_values.append((next_id, item["product_id"], item["quantity"], selected_json))
            if item_values:
                self.db.cursor.executemany(item_sql, item_values)

            if reserved_table_info:
                self._finalize_table_assignment(reserved_table_info['table_id'], next_id)
            self.db.conn.commit()
            self.last_assigned_table = table_value
            print(f"Don hang duoc tao thanh cong voi ID: {next_id}")
            return next_id
        except ValueError as e:
            self.last_error = str(e)
            lower_err = self.last_error.lower()
            if "ban" in lower_err:
                self.last_error_code = "conflict"
            else:
                self.last_error_code = "validation"
            print(f"Loi validation: {e}")
            if reserved_table_info:
                self._release_table_by_id(reserved_table_info['table_id'])
            if self.db.conn:
                self.db.conn.rollback()
            return None
        except Error as e:
            self.last_error = str(e)
            self.last_error_code = "database"
            print(f"Loi database khi them don hang: {e}")
            if reserved_table_info:
                self._release_table_by_id(reserved_table_info['table_id'])
            if self.db.conn:
                self.db.conn.rollback()
            return None
        except Exception as e:
            self.last_error = str(e)
            self.last_error_code = "unknown"
            print(f"Loi khong xac dinh: {e}")
            if reserved_table_info:
                self._release_table_by_id(reserved_table_info['table_id'])
            if self.db.conn:
                self.db.conn.rollback()
            return None

    def update_order_details(self, order_id, items=None, note=None,
                             table_number=None, customer_name=None,
                             needs_assistance=None):
        self.last_error = None
        self.last_assigned_table = None
        self.last_error_code = None
        try:
            self.ensure_connection()
            self.db.conn.start_transaction()

            lookup_cursor = self.db.conn.cursor(dictionary=True)
            try:
                lookup_cursor.execute("SELECT id, table_number FROM orders WHERE id = %s", (order_id,))
                existing = lookup_cursor.fetchone()
            finally:
                lookup_cursor.close()
            if not existing:
                message = f"Khong tim thay don hang {order_id}"
                self.last_error = message
                self.last_error_code = "not_found"
                print(message)
                return None

            current_table = self._normalize_table_number(existing.get("table_number"))
            assigned_table = current_table
            reserved_table_info = None

            sanitized_items = None
            total_price = None

            if items is not None:
                sanitized_items, total_price = self._validate_items(items)
                self.db.cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
                item_sql = '''INSERT INTO order_items (order_id, product_id, quantity, selected_options)
                              VALUES (%s, %s, %s, %s)'''
                item_values = []
                for item in sanitized_items:
                    selected = item.get("selected_options")
                    selected_json = json.dumps(selected) if selected is not None else None
                    item_values.append((order_id, item["product_id"], item["quantity"], selected_json))
                if item_values:
                    self.db.cursor.executemany(item_sql, item_values)

            update_fields = []
            update_values = []

            if total_price is not None:
                update_fields.append("total_price = %s")
                update_values.append(total_price)
            if note is not None:
                update_fields.append("note = %s")
                update_values.append(note)
            if table_number is not None:
                requested_table = self._normalize_table_number(table_number)
                if requested_table:
                    reserved_table_info = self._reserve_table_for_order(
                        order_id,
                        requested_table,
                        original_input=table_number
                    )
                    assigned_table = reserved_table_info["table_number"]
                    if current_table and current_table != assigned_table:
                        self._release_specific_table(current_table, order_id)
                    update_fields.append("table_number = %s")
                    update_values.append(assigned_table)
                else:
                    if current_table:
                        self._release_specific_table(current_table, order_id)
                    assigned_table = None
                    update_fields.append("table_number = NULL")
            if customer_name is not None:
                update_fields.append("customer_name = %s")
                update_values.append(str(customer_name).strip())
            if needs_assistance is not None:
                needs_assistance_value = self._sanitize_bool(needs_assistance)
                if needs_assistance_value is None:
                    needs_assistance_value = False
                update_fields.append("needs_assistance = %s")
                update_values.append(needs_assistance_value)

            if update_fields:
                update_sql = "UPDATE orders SET " + ", ".join(update_fields) + " WHERE id = %s"
                update_values.append(order_id)
                self.db.cursor.execute(update_sql, tuple(update_values))

            if reserved_table_info:
                self._finalize_table_assignment(reserved_table_info["table_id"], order_id)
            self.db.conn.commit()
            self.last_assigned_table = assigned_table
            return {
                "order_id": order_id,
                "total_price": float(total_price) if total_price is not None else None,
                "items": sanitized_items,
                "table_number": assigned_table
            }
        except ValueError as e:
            self.last_error = str(e)
            lower_err = self.last_error.lower()
            if "ban" in lower_err:
                self.last_error_code = "conflict"
            else:
                self.last_error_code = "validation"
            print(f"Loi validation khi cap nhat don hang: {e}")
            if reserved_table_info:
                self._release_table_by_id(reserved_table_info["table_id"])
            if self.db.conn:
                self.db.conn.rollback()
            return None
        except Error as e:
            self.last_error = str(e)
            self.last_error_code = "database"
            print(f"Loi database khi cap nhat don hang: {e}")
            if reserved_table_info:
                self._release_table_by_id(reserved_table_info["table_id"])
            if self.db.conn:
                self.db.conn.rollback()
            return None

    def update_order_status(self, order_id, status):
        self.last_error = None
        self.last_assigned_table = None
        self.last_error_code = None
        try:
            self.ensure_connection()

            normalized_status = self._normalize_status(status)
            if not normalized_status:
                raise ValueError("Trang thai khong duoc de trong")
            if normalized_status not in ORDER_STATUSES:
                raise ValueError(f"Trang thai {status} khong hop le")

            self.db.cursor.execute("SELECT status FROM orders WHERE id = %s", (order_id,))
            result = self.db.cursor.fetchone()
            if not result:
                message = f"Khong tim thay don hang {order_id}"
                self.last_error = message
                self.last_error_code = "not_found"
                print(message)
                return False

            current_status = self._normalize_status(result[0])
            if current_status == normalized_status:
                return True

            if not self._is_transition_allowed(current_status, normalized_status):
                raise ValueError(f"Khong the chuyen tu {current_status} sang {normalized_status}")

            update_sql = "UPDATE orders SET status = %s"
            params = [normalized_status]
            if normalized_status != "served":
                update_sql += ", qr_code_data = NULL"
            update_sql += " WHERE id = %s"
            params.append(order_id)

            self.db.cursor.execute(update_sql, tuple(params))
            self.db.conn.commit()

            if normalized_status in {"cancelled", "served"}:
                self._release_table_for_order(order_id)

            print(f"Order {order_id} status updated to {normalized_status}")
            return True
        except ValueError as e:
            self.last_error = str(e)
            self.last_error_code = "validation"
            print(f"Loi validation khi cap nhat trang thai: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False
        except Error as e:
            self.last_error = str(e)
            self.last_error_code = "database"
            print(f"Loi database khi cap nhat trang thai: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False

    def update_payment_status(self, order_id, payment_status):
        try:
            self.ensure_connection()
            normalized = "paid" if str(payment_status).strip().lower() == "paid" else "unpaid"
            self.db.cursor.execute(
                "UPDATE orders SET payment_status = %s WHERE id = %s",
                (normalized, order_id)
            )
            self.db.conn.commit()
            return True
        except Error as e:
            print(f"Loi khi cap nhat trang thai thanh toan: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False

    def mark_order_served(self, order_id):
        self.last_error = None
        self.last_assigned_table = None
        self.last_error_code = None
        try:
            self.ensure_connection()

            self.db.cursor.execute("SELECT status, total_price FROM orders WHERE id = %s", (order_id,))
            row = self.db.cursor.fetchone()
            if not row:
                message = f"Khong tim thay don hang {order_id}"
                self.last_error = message
                self.last_error_code = "not_found"
                print(message)
                return None

            current_status = self._normalize_status(row[0])
            if not self._is_transition_allowed(current_status, "served"):
                raise ValueError(f"Trang thai hien tai {current_status} khong cho phep danh dau da phuc vu")

            total_price = float(row[1]) if row[1] is not None else 0.0
            qr_payload = json.dumps({
                "order_id": order_id,
                "amount": round(total_price, 2)
            })

            self.db.cursor.execute(
                "UPDATE orders SET status = %s, qr_code_data = %s WHERE id = %s",
                ("served", qr_payload, order_id)
            )
            self.db.conn.commit()
            self._release_table_for_order(order_id)
            print(f"Order {order_id} marked as served")
            return qr_payload
        except ValueError as e:
            self.last_error = str(e)
            self.last_error_code = "validation"
            print(f"Loi validation khi danh dau da phuc vu: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return None
        except Error as e:
            self.last_error = str(e)
            self.last_error_code = "database"
            print(f"Loi database khi danh dau da phuc vu: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return None

    def get_qr_code_data(self, order_id):
        try:
            self.ensure_connection()
            self.db.cursor.execute("SELECT qr_code_data FROM orders WHERE id = %s", (order_id,))
            row = self.db.cursor.fetchone()
            return row[0] if row else None
        except Error as e:
            print(f"Loi database khi lay du lieu QR: {e}")
            return None

    def get_order(self, order_id):
        try:
            self.ensure_connection()
            try:
                self.db.conn.commit()
            except Error:
                pass
            order_cursor = self.db.conn.cursor(dictionary=True)
            try:
                order_cursor.execute('''SELECT * FROM orders WHERE id = %s''', (order_id,))
                order = order_cursor.fetchone()
            finally:
                order_cursor.close()
            if not order:
                return None

            item_cursor = self.db.conn.cursor(dictionary=True)
            try:
                item_cursor.execute(
                    '''SELECT oi.product_id, oi.quantity, oi.selected_options, p.name, p.price
                       FROM order_items oi
                       JOIN products p ON oi.product_id = p.id
                       WHERE oi.order_id = %s''',
                    (order_id,)
                )
                order_items = item_cursor.fetchall()
            finally:
                item_cursor.close()

            for item in order_items:
                selected = item.get("selected_options")
                if isinstance(selected, str):
                    try:
                        item["selected_options"] = json.loads(selected)
                    except (TypeError, ValueError):
                        pass

            order["items"] = order_items
            return order
        except Error as e:
            print(f"Error getting order: {e}")
            return None

    def get_all_orders(self, status=None):
        try:
            self.ensure_connection()
            try:
                self.db.conn.commit()
            except Error:
                pass
            sql = '''SELECT * FROM orders'''
            params = ()

            if status:
                if isinstance(status, (list, tuple, set)):
                    normalized_statuses = []
                    for item in status:
                        normalized = self._normalize_status(item)
                        if normalized and normalized in ORDER_STATUSES:
                            normalized_statuses.append(normalized)
                    if normalized_statuses:
                        placeholders = ", ".join(["%s"] * len(normalized_statuses))
                        sql += f" WHERE status IN ({placeholders})"
                        params = tuple(normalized_statuses)
                else:
                    normalized = self._normalize_status(status)
                    if normalized and normalized in ORDER_STATUSES:
                        sql += " WHERE status = %s"
                        params = (normalized,)

            sql += " ORDER BY id DESC"
            cursor = self.db.conn.cursor(dictionary=True)
            try:
                cursor.execute(sql, params)
                orders = cursor.fetchall()
            finally:
                cursor.close()
            return orders
        except Error as e:
            print(f"Error getting orders: {e}")
            return []

    def get_orders_by_statuses(self, statuses):
        return self.get_all_orders(status=statuses)

    def get_tables_overview(self):
        try:
            self.ensure_connection()
            cursor = self.db.conn.cursor(dictionary=True)
            try:
                cursor.execute(
                    '''
                    SELECT
                        t.id,
                        t.table_number,
                        t.display_name,
                        t.is_occupied,
                        t.current_order_id,
                        o.status AS order_status,
                        o.payment_status,
                        o.customer_name,
                        o.total_price,
                        o.needs_assistance,
                        o.note,
                        o.created_at
                    FROM dining_tables t
                    LEFT JOIN orders o ON o.id = t.current_order_id
                    ORDER BY LENGTH(t.table_number), t.table_number
                    '''
                )
                return cursor.fetchall()
            finally:
                cursor.close()
        except Error as e:
            print(f"Error getting table overview: {e}")
            return []

    def get_table_configuration(self):
        try:
            self.ensure_connection()
            cursor = self.db.conn.cursor(dictionary=True)
            try:
                cursor.execute(
                    "SELECT table_number, display_name FROM dining_tables ORDER BY LENGTH(table_number), table_number"
                )
                rows = cursor.fetchall()
                return [
                    {"number": row["table_number"], "name": row["display_name"]}
                    for row in rows
                ]
            finally:
                cursor.close()
        except Error as e:
            print(f"Error getting table configuration: {e}")
            return []

    def delete_order(self, order_id):
        try:
            self.ensure_connection()
            self.last_error = None
            self.last_assigned_table = None
            self.last_error_code = None
            self._release_table_for_order(order_id)
            self.db.cursor.execute("DELETE FROM order_items WHERE order_id = %s", (order_id,))
            self.db.cursor.execute("DELETE FROM orders WHERE id = %s", (order_id,))
            self.db.conn.commit()
            print(f"Order {order_id} deleted successfully")
            return True
        except Error as e:
            self.last_error = str(e)
            self.last_error_code = "database"
            print(f"Error deleting order: {e}")
            if self.db.conn:
                self.db.conn.rollback()
            return False
