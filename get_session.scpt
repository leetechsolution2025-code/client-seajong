tell application "Google Chrome"
    set theResult to ""
    repeat with w in windows
        repeat with t in tabs of w
            if URL of t starts with "http://localhost:3000" then
                set theResult to execute t javascript "
                    try {
                        var xhr = new XMLHttpRequest();
                        xhr.open('GET', '/api/auth/session', false);
                        xhr.send(null);
                        xhr.responseText;
                    } catch (e) {
                        e.toString();
                    }
                "
                exit repeat
            end if
        end repeat
        if theResult is not "" then exit repeat
    end repeat
    return theResult
end tell
