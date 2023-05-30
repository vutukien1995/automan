var express = require('express');
var router = express.Router();

// Requiring the module
const reader = require('xlsx');

router.post('/json-converter', async function (req, res, next) {

    if (!req.files || !req.files.data) {
        res.send(400, {
            success: false,
            message: 'No file uploaded'
        });
    } else {

        //Use the name of the input field (i.e. "avatar") to retrieve the uploaded file
        let dataFile = req.files.data;

        //Use the mv() method to place the file in the upload directory (i.e. "uploads")
        let fileDestination = './uploads/' + dataFile.name;
        await dataFile.mv(fileDestination);

        console.log('fileDestination: ', fileDestination);
        const xlsxFile = reader.readFile(fileDestination);
        const sheets = xlsxFile.SheetNames;
        console.log('Sheets name: ', sheets);

        let data = [];

        const temp = reader.utils.sheet_to_json(xlsxFile.Sheets[xlsxFile.SheetNames[0]]);
        try {
            temp.forEach((r) => {
                console.log('raw: ', r);
                r = dataToJson(r);
                data.push(r)
            })
        } catch (error) {
            console.log("error: ", error);
            res.status(400).send({
                success: "false",
                message: error.message
            });
            return;
        }

        res.status(200).send(data);

    }

});



// ============================ PRIVATE FUNCTION =============================

function dataToJson(raw) {
    if (raw['data']) {
        let str = raw['data'];
        str = str.replace('\r', '');
        str = str.replace('\n', '');
        str = str.replace('\t', '');

        let result = JSON.parse(str);

        raw['data'] = result;
    }

    return raw;
}

module.exports = router;