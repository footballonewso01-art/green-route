from playwright.sync_api import sync_playwright
import time

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        errors = []
        page.on("console", lambda msg: errors.append(f"Console {msg.type}: {msg.text}") if msg.type == "error" else None)

        print("Navigating to login...")
        page.goto("http://localhost:8085/login")
        
        print("Logging in...")
        page.fill('input[type="email"]', "admin@greenroute.dev")
        page.fill('input[type="password"]', "Password123!")
        page.click('button[type="submit"]')

        print("Waiting for dashboard...")
        page.wait_for_url("http://localhost:8085/dashboard")
        
        # Wait a moment for data to load
        time.sleep(2)
        
        print("Clicking Save Profile...")
        # The save button is probably "Save Changes" or similar in DashboardProfile
        try:
            page.click("text='Save Changes'")
        except:
            print("Could not find 'Save Changes', trying other selectors...")
            page.click("button:has-text('Save')")
            
        print("Waiting to see toast response...")
        # Wait for toast
        time.sleep(2)
        
        # Get toast text if any
        toasts = page.locator(".sonner-toast").all_text_contents()
        for t in toasts:
            print("TOAST:", t)

        for e in errors:
            print(e)
            
        browser.close()

if __name__ == "__main__":
    run()
