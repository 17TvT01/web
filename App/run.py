import argparse
from main import StoreManager
from order_gui import main as order_gui_main

def run_cli():
    store = StoreManager()
    store.run()

def run_order_gui():
    order_gui_main()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Store Management System')
    parser.add_argument(
        '--mode', 
        choices=['cli', 'order'], 
        default='order',
        help='Run in CLI or Order Management mode (default: order)'
    )

    args = argparse.ArgumentParser(description='Store Management System')
    args.add_argument(
        '--mode', 
        choices=['cli', 'order'], 
        default='order',
        help='Run in CLI or Order Management mode (default: order)'
    )

    args = args.parse_args()
    
    if args.mode == 'cli':
        run_cli()
    else:
        run_order_gui()

if __name__ == "__main__":
    run_order_gui()
