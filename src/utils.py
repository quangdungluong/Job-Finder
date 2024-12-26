import random
import time

from selenium import webdriver
from selenium.webdriver.remote.webelement import WebElement

from src.logger import logger


def chrome_browser_options():
    options = webdriver.ChromeOptions()

    options.add_argument("--disable-software-rasterizer")
    options.add_argument("--start-maximized")
    options.add_argument("--no-sandbox")
    options.add_argument("--disable-dev-shm-usage")
    options.add_argument("--ignore-certificate-errors")
    options.add_argument("--disable-extensions")
    options.add_argument("--disable-gpu")
    options.add_argument("window-size=1200x800")
    options.add_argument("--disable-popup-blocking")
    options.add_argument("--headless=new")
    options.add_argument("user-data-dir=Default")
    return options


def is_headless(driver: webdriver.Chrome):
    return (
        driver.capabilities["goog:chromeOptions"].get("args", []).count("--headless")
        > 0
    )


def is_scrollable(element: WebElement):
    scroll_height = element.get_attribute("scrollHeight")
    client_height = element.get_attribute("clientHeight")
    scrollable = int(scroll_height) > int(client_height)
    return scrollable


def scroll_slow(
    driver: webdriver.Chrome,
    scrollable_element: WebElement,
    start=0,
    end=3600,
    step=300,
    reverse=False,
):
    if reverse:
        start, end = end, start
        step = -step

    max_scroll_height = int(scrollable_element.get_attribute("scrollHeight"))
    current_scroll_position = int(float(scrollable_element.get_attribute("scrollTop")))

    if reverse:
        if current_scroll_position < start:
            start = current_scroll_position
    else:
        if end > max_scroll_height:
            end = max_scroll_height

    script_scroll_to = "arguments[0].scrollTop = arguments[1];"

    try:
        if scrollable_element.is_displayed():
            if not is_scrollable(scrollable_element):
                return
            if (step > 0 and start >= end) or (step < 0 and start <= end):
                return

            position = start
            previous_position = None
            while (step > 0 and position < end) or (step < 0 and position > end):
                if position == previous_position:
                    break

                try:
                    driver.execute_script(
                        script_scroll_to, scrollable_element, position
                    )
                except Exception as e:
                    logger.error(e)

                previous_position = position
                position += step

                step = max(10, abs(step) - 10) * (-1 if reverse else 1)
                time.sleep(random.uniform(0.2, 0.5))
            driver.execute_script(script_scroll_to, scrollable_element, end)
            time.sleep(0.5)
        else:
            logger.warning("The element is not visible.")
    except Exception as e:
        logger.error(e)
