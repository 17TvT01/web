import argparse
from main import StoreManager
from gui import main as gui_main

def run_cli():
    store = StoreManager()
    store.run()

def run_gui():
    gui_main()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Store Management System')
    parser.add_argument(
        '--mode', 
        choices=['cli', 'gui'], 
        default='gui',
        help='Run in CLI or GUI mode (default: gui)'
    )

    args = parser.parse_args()
    
    if args.mode == 'cli':
        run_cli()
    else:
        run_gui()