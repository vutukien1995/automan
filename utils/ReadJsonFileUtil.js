module.exports.read = function (path) {
    const fs = require('fs');

    try {
        let rawdata = fs.readFileSync(path);
        let jsonData = JSON.parse(rawdata);
        
        return jsonData;
    } catch (error) {
        console.log(error);
        return;
    }

}