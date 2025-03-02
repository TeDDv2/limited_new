import json
import time
from buzzsneakers.get_product import get_product
import database.main as database
import buzzsneakers.utils as utils
from buzzsneakers.types import Thread, ProductManager
import requests

def notify_web_server(event_type, data):
    try:
        payload = {
            'event': event_type,
            'data': data
        }
        response = requests.post('http://localhost:3800/monitor-update', json=payload)
        print(f"[MONITOR] Notification sent to web server: {event_type}, Status: {response.status_code}")
    except Exception as e:
        print(f"[MONITOR] Failed to notify web server: {e}")

def monitor(pid: str, parentThread: Thread):
    print('[{}] Starting thread.'.format(pid))

    while not parentThread.stop:
        data = get_product(pid)
        if not data["flag"]:
            print(f"[{pid}] Product not found.")

            if database.get_product(pid):
                database.delete_product(pid)

                for size in data["sizes"]:
                    database.delete_size(size["combId"])

                print(f"[{pid}] Product removed from database.")
                
                notify_web_server('product_deleted', {'pid': pid})
                return
            return

        if not database.get_product(pid):
            print(f"[{pid}] Product added to database.")

            product = ProductManager.build(data)
            database.add_product_to_db(product)
            utils.SendWebhook(data, "https://discord.com/api/webhooks/1223385364488523808/OZYD2h-TBcDk7X_l-t70RC21fjCOfOh7W3LcTgN0C1Jq3IqGEG9vflrc1HpiLR4seUuY", True)
            
            notify_web_server('product_added', json.loads(product))

        else:
            isInstock = utils.GetStockBool(data)

            if not isInstock:
                return

            product = json.loads(ProductManager.build(data))

            current_price = product["price"]
            old_price = database.get_product(pid)[3]

            if old_price != current_price:
                print('[{}] Price has changed. ({} -> {})'.format(pid, old_price, current_price))

                try:
                    utils.SendWebhook(data, "https://discord.com/api/webhooks/1223385364488523808/OZYD2h-TBcDk7X_l-t70RC21fjCOfOh7W3LcTgN0C1Jq3IqGEG9vflrc1HpiLR4seUuY", False)
                    database.update_product_price(pid, current_price)
                    
                    notify_web_server('price_changed', {
                        'pid': pid,
                        'old_price': old_price,
                        'new_price': current_price,
                        'product': product
                    })
                except Exception as e:
                    print(f"[{pid}] Failed to update price: {e}")

            old_quantity = database.get_product(pid)[5]
            current_quantity = product["quantity"]

            if old_quantity != current_quantity:
                print('[{}] Quantity has changed. ({} -> {})'.format(pid, old_quantity, current_quantity))

                current_sizes = product["sizes"]
                size_updates = []

                for current_size in current_sizes:
                    size = database.get_size(current_size["combId"])

                    if not size:
                        database.add_size(current_size["combId"], pid, current_size["stock"], current_size["name"], True)
                        print(f"[{pid}] Size added to database.")
                        size_updates.append({
                            'combId': current_size["combId"],
                            'action': 'added',
                            'name': current_size["name"],
                            'stock': current_size["stock"]
                        })

                    else:
                        old_stock = float(size[2])
                        current_stock = float(current_size["stock"])

                        if old_stock != current_stock:
                            if (old_stock > 0 and current_stock == 0) or (old_stock == 0 and current_stock > 0):
                                print('[{} - {}] Quantity has changed for variant. ({} -> {})'.format(pid, current_size["combId"], old_stock, current_stock))

                                if bool(utils.GetStockBoolSizeStock(current_size)):
                                    utils.SendWebhook(data, "https://discord.com/api/webhooks/1223385364488523808/OZYD2h-TBcDk7X_l-t70RC21fjCOfOh7W3LcTgN0C1Jq3IqGEG9vflrc1HpiLR4seUuY", False)
                                database.find_size_and_update_stock(pid, current_size["combId"], current_stock)
                                
                                size_updates.append({
                                    'combId': current_size["combId"],
                                    'action': 'updated',
                                    'name': current_size["name"],
                                    'old_stock': old_stock,
                                    'new_stock': current_stock
                                })

                database.update_product_quantity(pid, current_quantity)
                
                if size_updates:
                    notify_web_server('size_changed', {
                        'pid': pid,
                        'old_quantity': old_quantity,
                        'new_quantity': current_quantity,
                        'size_updates': size_updates,
                        'product': product
                    })

        time.sleep(1)