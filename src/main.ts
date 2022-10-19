import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as slack from "@slack/web-api";
import * as fs from "fs";
import * as path from "path";

const defaultMaxRetryCount = 3;

interface Option {
    slackToken: string;
    slackApiUrl: string | undefined;
    channels: string | undefined;
    content: string | undefined;
    filePath: string | undefined;
    filePathFollowSymbolicLinks: boolean;
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
        filePathFollowSymbolicLinks: getInput("file_path_follow_symbolic_links") == "true",
        fileName: getInputOrUndefined("file_name"),
        fileType: getInputOrUndefined("file_type"),
        initialComment: getInputOrUndefined("initial_comment"),
        threadTs: getInputOrUndefined("thread_ts"),
        title: getInputOrUndefined("title"),
        retries: getInputNumberOrUndefined("retries"),
    };
}

async function postByContent(client: slack.WebClient, option: Option): Promise<slack.FilesUploadResponse> {
    return await client.files.upload({
        channels: option.channels,
        content: option.content,
        filename: option.fileName,
        filetype: option.fileType,
        initial_comment: option.initialComment,
        thread_ts: option.threadTs,
        title: option.title,
    });
}

async function postByFile(client: slack.WebClient, option: Option): Promise<slack.FilesUploadResponse> {
    if (option.filePath == undefined) {
        throw Error("illegal state");
    }
    const globber = await glob.create(option.filePath, { followSymbolicLinks: option.filePathFollowSymbolicLinks });
    const filePaths = await globber.glob();
    if (filePaths.length == 0) {
        throw Error("not found files");
    } else if (filePaths.length == 1) {
        const file = fs.readFileSync(filePaths[0]);
        return await client.files.upload({
            channels: option.channels,
            file: file,
            filename: path.basename(filePaths[0]),
            filetype: option.fileType,
            initial_comment: option.initialComment,
            thread_ts: option.threadTs,
            title: option.title,
        });
    } else {
        const permalinks: string[] = [];
        for (const filePath of filePaths.slice(1)) {
            const file = fs.readFileSync(filePath);
            const result = await client.files.upload({
                file: file,
                filename: path.basename(filePath),
                filetype: option.filePath,
            });
            if (result.ok && result.file?.permalink) {
                permalinks.push(result.file.permalink);
            } else {
                throw Error("cannot upload files");
            }
        }
        {
            const filePath = filePaths[0];
            const file = fs.readFileSync(filePath);
            let initalComment: string | undefined;
            if (option.channels == undefined) {
                initalComment = undefined;
            } else if (option.initialComment == undefined) {
                initalComment = permalinks.map((x) => `<${x}| >`).join();
            } else {
                const postfix = permalinks.map((x) => `<${x}| >`).join();
                initalComment = `${option.initialComment} ${postfix}`;
            }
            return await client.files.upload({
                channels: option.channels,
                content: option.content,
                file: file,
                filename: path.basename(filePath),
                filetype: option.fileType,
                initial_comment: initalComment,
                thread_ts: option.threadTs,
                title: option.title,
            });
        }
    }
}

async function run() {
    try {
        const option = readOption();
        const client = new slack.WebClient(option.slackToken, {
            slackApiUrl: option.slackApiUrl,
            retryConfig: { retries: option.retries ?? defaultMaxRetryCount },
        });
        const result =
            option.filePath == undefined ? await postByContent(client, option) : await postByFile(client, option);
        if (result.ok == false) {
            core.setFailed(result.error ?? "unknown error");
            return;
        }
        core.setOutput("response", JSON.stringify(result));
        core.setOutput("uploaded_file_id", result.file?.id ?? "");
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();
