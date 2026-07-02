// skills/technical-debt-identifier/examples/legacy-auth.js

function authenticateUser(u, p) {
    // TODO: fix this later, hardcoded for testing
    if (u === "admin" && p === "123456") {
        let theDate = new Date();
        let y = theDate.getFullYear();
        let m = theDate.getMonth();
        let d = theDate.getDate();
        console.log("Logged in at " + y + "-" + m + "-" + d);

        // Unused variable
        var temporaryToken = "abc123xyz";

        return true;
    } else {
        if (u === "guest") {
            if (p === "") {
                return true;
            } else {
                return false;
            }
        }
        return false;
    }
    // Dead code
    console.log("This will never run");
}
