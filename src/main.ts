import * as core from "@actions/core";
import * as slack from "@slack/web-api";
import * as fs from "fs";

const defaultMaxRetryCount = 3;

interface Option {
    slackToken: string;
    slackApiUrl: string | undefined;
    channels: string | undefined;
    content: string | undefined;
    filePath: string | undefined;
    fileName: string | undefined;
    fileType: string | undefined;
    initialComment: string | undefined;
    threadTs: string | undefined;
    title: string | undefined;
    retries: number | undefined;
}

function getInput(key: string): string {
    return core.getInput(key, { required: true });
}

function getInputOrUndefined(key: string): string | undefined {
    const result = core.getInput(key, { required: false });
    if (result.length == 0) {
        return undefined;
    }
    return result;
}

function getInputNumberOrUndefined(key: string): number | undefined {
    const value = getInputOrUndefined(key);
    if (value == undefined) {
        return undefined;
    }
    return parseInt(value);
}

function readOption(): Option {
    return {
        slackToken: getInput("slack_token"),
        slackApiUrl: getInputOrUndefined("slack_api_url"),
        channels: getInputOrUndefined("channels"),
        content: getInputOrUndefined("content"),
        filePath: getInputOrUndefined("file_path"),
        fileName: getInputOrUndefined("file_name"),
        fileType: getInputOrUndefined("file_type"),
        initialComment: getInputOrUndefined("initial_comment"),
        threadTs: getInputOrUndefined("thread_ts"),
        title: getInputOrUndefined("title"),
        retries: getInputNumberOrUndefined("retries"),
    };
}

async function run() {
    try {
        const option = readOption();
        const client = new slack.WebClient(option.slackToken, {
            slackApiUrl: option.slackApiUrl,
            retryConfig: { retries: option.retries ?? defaultMaxRetryCount },
        });
        let file: Buffer | undefined;
        if (option.filePath) {
            file = fs.readFileSync(option.filePath);
        }
        const result = await client.files.upload({
            channels: option.channels,
            content: option.content,
            file: file,
            filename: option.fileName,
            filetype: option.fileType,
            initial_comment: option.initialComment,
            thread_ts: option.threadTs,
            title: option.title,
        });
        if (result.ok == false) {
            core.setFailed(result.error ?? "unknown error");
            return;
        }
        core.setOutput("response", JSON.stringify(result));
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();
