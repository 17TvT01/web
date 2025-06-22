from product_manager import ProductManager

import tkinter as tk
from gui import StoreGUI

if __name__ == "__main__":
    root = tk.Tk()
    app = StoreGUI(root)
    root.mainloop()