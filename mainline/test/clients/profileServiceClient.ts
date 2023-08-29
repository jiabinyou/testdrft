import { config } from 'aws-sdk';
import { local_constants } from '../constants/localConstants';
import TestContext from '../lib/TestContext';
import aws4 from "aws4";
import {getCredentials} from "../Util/credential";
const https = require('https');

const PLATFORM = local_constants.PLATFORM;
const DEVICE_TOKEN = local_constants.DEVICE_TOKEN;
const POST = local_constants.POST;
const DELETE = local_constants.DELETE;
const SERVICE_NAME = local_constants.SERVICE_NAME;
const PROFILE_PATH = local_constants.PROFILE_PATH;
const DEVICE_PATH = local_constants.DEVICE_PATH;

let HOST: string;
if (TestContext.stageName == 'prod') {
    HOST = local_constants.HOST_PROD
} else if (TestContext.stageName == 'gamma'){
    HOST = local_constants.HOST_GAMMA
} else {
    // alpha or test accounts
    HOST =  local_constants.HOST_ALPHA
}

export const registerDevice = async (profileId: string) => {
    const credentials = await getCredentials();

    const postRequestBody = JSON.stringify({
        Platform: PLATFORM,
        DeviceToken: DEVICE_TOKEN,
        Capabilities: 1,
    });

    const putOpts = getPostOpts(postRequestBody, HOST, profileId);
    aws4.sign(putOpts, credentials);
    const postResponse = await httpsRequestWrapper(putOpts, postRequestBody);

    if (postResponse.response.statusCode == 200) {
        console.log('registerDevice finish successfully!');
    } else {
        console.log('registerDevice fail, pay attention to error message!');
        console.log(postResponse.response.body)
    }
    expect(postResponse.response.statusCode).toBe(200);

    return postResponse.data;
};

export const logOutProfile = async (profileId: string) => {
    /**
     * For Hydra Pipeline test: The ENV variables, AWS_ACCESS_KEY_ID,
     * AWS_SECRET_ACCESS_KEY, AWS_SESSION_TOKEN will be provided automatically.
     */
    let credentials;
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY && process.env.AWS_SESSION_TOKEN) {
        credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
            sessionToken: process.env.AWS_SESSION_TOKEN
        };
    } else {
        /**
         * For local testing: Get the credentials from ~/.aws/credentials,
         * which is usually updated through ada credential update.
         */
        credentials = config.credentials;
    }

    const deleteRequestBody = JSON.stringify({
    });

    const deleteOpts = getDeleteOpts(deleteRequestBody, HOST, profileId);
    aws4.sign(deleteOpts, credentials);
    const deleteResponse = await httpsRequestWrapper(deleteOpts, deleteRequestBody);

    expect(deleteResponse.response.statusCode).toBe(204);
    if (deleteResponse.response.statusCode == 204) {
        console.log('logOutProfile finish successfully!');
    } else {
        console.log('logOutProfile fail, pay attention to error message!');
    }
    return deleteResponse.data;
};

export function httpsRequestWrapper(signedOpts: any, requestBody: string): Promise<any> {
    return new Promise((resolve) => {
        const request = https.request(signedOpts, (response: any) => {
            let str = '';
            response.on('data', (chunk: any) => {
                str += chunk;
            });

            response.on('end', () => {
                resolve({
                    data: str,
                    response,
                });
            });
        });
        request.write(requestBody);
        request.end();
    });
}

/**
 * Function to get request parameters/headers for a standard registerDevice request.
 *
 * @param postRequestBody: string - The request body in string format.
 * @param host: string - The API Gateway Endpoint that will be hit.
 */
function getPostOpts(postRequestBody: string, host: string, profileId: string): any {
    return {
        method: POST,
        host,
        service: SERVICE_NAME,
        path: PROFILE_PATH + profileId + DEVICE_PATH,
        body: postRequestBody,
        timeout: 15000,
    };
}

/**
 * Function to get request parameters/headers for a standard logOutProfile request.
 *
 * @param requestBody: string - The request body in string format.
 * @param host: string - The API Gateway Endpoint that will be hit.
 */
function getDeleteOpts(deleteRequestBody: string, host: string, profileId: string): any {
    return {
        method: DELETE,
        host,
        service: SERVICE_NAME,
        path: PROFILE_PATH + profileId + DEVICE_PATH,
        body: deleteRequestBody,
        timeout: 15000,
    };
}
