var express = require('express');
var router = express.Router();

const newman = require('newman');
const axios = require('axios');
const readJsonFileUtil = require('../utils/ReadJsonFileUtil');
const timeUtil = require('../utils/TimeUtil');



router.post('/html-report', async function (req, res, next) {

    console.log("/html-report: start ===> ");
    console.log('headers: ', req.headers);

    if (!req.files || !req.files.collection) {
        res.send(400, {
            success: false,
            message: 'No file needed'
        });
    } else {

        let dataFile;
        let collectionFile = req.files.collection;

        let dataFileDestination;
        let collectionFileDestination = './uploads/' + collectionFile.name;

        if (req.files.data) {
            dataFile = req.files.data;
            dataFileDestination = './uploads/' + dataFile.name;
            await dataFile.mv(dataFileDestination);

            // validate for sendResultToJira
            if (checkHaveTestCase(dataFileDestination)) {
                if
                    (!req.headers.authorization) {
                    res.send(400, {
                        success: false,
                        message: "Add Basic Auth for Send result to Jira"
                    });
                    return;
                }
            }
        }

        await collectionFile.mv(collectionFileDestination);

        // export file
        let exportDestination = "./newman/" + collectionFile.name + (new Date().toDateString()) + ".html";

        await newman.run({
            collection: collectionFileDestination, // Collection URL from a public link or the Postman API can also be used 
            iterationData: dataFileDestination ? dataFileDestination : "",
            reporters: ['htmlextra'],
            // reporters: 'cli',
            reporter: {
                htmlextra:
                {
                    export: exportDestination,
                    // template: './template.hbs'
                    // logs: true,
                    // showOnlyFails: true,
                    // noSyntaxHighlighting: true,
                    // testPaging: true,
                    // browserTitle: "My Newmanreport",
                    // title: "My Newman Report",
                    // titleSize: 4,
                    // omitHeaders: true,
                    // skipHeaders:"Authorization",
                    // omitRequestBodies: true,
                    // omitResponseBodies: true,
                    // hideRequestBody:["Login"],
                    // hideResponseBody: ["AuthRequest"],
                    // showEnvironmentData: true,
                    // skipEnvironmentVars:["API_KEY"],
                    // showGlobalData: true,
                    // skipGlobalVars: ["API_TOKEN"],
                    // skipSensitiveData: true,
                    // showMarkdownLinks: true,
                    // showFolderDescription: true,
                    // timezone: "Australia/Sydney",
                    // skipFolders: "folder name with space, folderWithoutSpace",
                    // skipRequests: "request name with space, requestNameWithoutSpace",
                    // displayProgressBar: true
                }
            }
        }, (err, result) => {
            if (err)
                res.send(400, {
                    success: false,
                    message: err
                });
            else {

                // Send result to Jira
                // if (dataFileDestination) {
                //     sendResultToJira(readJsonFileUtil.read(dataFileDestination), result, req);
                // }

                res.send(200, {
                    success: true,
                    message: "Html report end !!!",
                    result: result
                })

                // res.download(exportDestination);

                console.log('/html-report end <=== ')
            }
        });

    }

});



// ============================================== PRIVATE FUNCTION =================================================

function sendResultToJira(data, result, req) {
    for (let d of data) {
        console.log('sendResultToJira' + " ===>" + d.test_case);

        if (!d.test_case)
            continue;

        let execution = getExecutionByTestCase(result.run.executions, d.test_case);
        execution.response.stream = execution.response.stream.toString();
        if (execution) {
            console.log('rq: ');
            console.log(JSON.stringify(execution.request));
            console.log('rp: ');
            console.log(JSON.stringify(execution.response));

            createExecution(req.headers.authorization, d.test_name, execution.request, execution.response, execution.assertions, getStatusExecution(execution), d.test_case);
        }
        else
            console.log('have no execution');
    }
}

function checkHaveTestCase(dataFileDestination) {
    let dataOfFile = readJsonFileUtil.read(dataFileDestination);
    for (let d of dataOfFile) {
        if (d.test_case)
            return true;
    }

    return false;
}

function createExecution(authorization, executionSummary, requestEvident, responseEvident, assertionsEvident, executionStatus, test_case) {
    axios.post('https://office1.techcombank.com.vn/rest/api/2/issue/', {
        "fields": {
            "project": {
                "key": "H2HNEWCAPABILITY"
            },
            "summary": executionSummary,
            "labels": [
                "SIT",
                "Sprint1",
                "API"
            ],
            "issuetype": {
                "name":
                    "Test Execution"
            },
            "priority": {
                "name": "High"
            },
            "assignee": {
                "name": "kienvt3"
            },
            "customfield_10864": [
                "Automation"
            ]
        }
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": authorization
        }
    })
        .then(function (response) {
            // handle success
            console.log('status: ', response.status);
            console.log('data: ', response.data);

            let key = response.data.key;
            updateTestCase(authorization, key, requestEvident, responseEvident, assertionsEvident, executionStatus, test_case);
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        })
        .finally(function () {
            // always executed
        });
}

function updateTestCase(authorization, executionKey, requestEvident, responseEvident, assertionsEvident, executionStatus, test_case) {
    axios.post('https://office1.techcombank.com.vn/rest/raven/1.0/import/execution/', {
        "testExecutionKey": executionKey,
        "tests": [
            {
                "testKey": test_case,
                "start": timeUtil.getNowDate(),
                "finish": timeUtil.getNowDate(),
                "comment": "REQUEST: " + "\r\n" + JSON.stringify(requestEvident)
                    + "\r\n" + "\r\n" + "\r\n"
                    + "RESPONSE: " + "\r\n" + JSON.stringify(responseEvident)
                    + "\r\n" + "\r\n" + "\r\n"
                    + "ASSERTIONS: " + "\r\n" + JSON.stringify(assertionsEvident)
                    ,
                "status": executionStatus
            }
        ]
    }, {
        headers: {
            "Content-Type": "application/json",
            "Authorization": authorization
        }
    })
        .then(function
            (response) {
            // handle success
            console.log('status: ', response.status);
            console.log('data: ', response.data);
        })
        .catch(function (error) {
            // handle error
            console.log(error);
        })
        .finally(function () {
            // always executed
        });
}

function getExecutionByTestCase(executions, test_case) {
    for (let execution of executions) {
        if (JSON.stringify(execution.assertions).includes(test_case))
            return execution;
    }
}

function getStatusExecution(execution) {
    let assertions = execution.assertions;
    for (let assertion of assertions) {
        if (assertion.error)
            return "FAIL";
    }

    return "PASS";
}

module.exports = router;