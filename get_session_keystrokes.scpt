tell application "Google Chrome"
    activate
    make new tab at end of tabs of front window
    set URL of active tab of front window to "http://localhost:3000/api/auth/session"
    delay 1.5
end tell

tell application "System Events"
    keystroke "a" using command down
    delay 0.3
    keystroke "c" using command down
    delay 0.3
    keystroke "w" using command down
end tell
