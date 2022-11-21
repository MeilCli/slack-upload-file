import * as core from "@actions/core";
import * as glob from "@actions/glob";
import * as slack from "@slack/web-api";
import * as fs from "fs";
import * as path from "path";

const defaultMaxRetryCount = 3;

interface Option {
    slackToken: string;
    slackApiUrl: string | undefined;
    channel_id: string | undefined;
    content: string | undefined;
    filePath: string | undefined;
    filePathFollowSymbolicLinks: boolean;
    fileName: string | undefined;
    fileType: string | undefined;
    initialComment: string | undefined;
    threadTs: string | undefined;
    title: string | undefined;
    retries: number | undefined;
    deleteFileIdBeforeUpload: string | undefined;
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
        channel_id: getInputOrUndefined("channel_id"),
        content: getInputOrUndefined("content"),
        filePath: getInputOrUndefined("file_path"),
        filePathFollowSymbolicLinks: getInput("file_path_follow_symbolic_links") == "true",
        fileName: getInputOrUndefined("file_name"),
        fileType: getInputOrUndefined("file_type"),
        initialComment: getInputOrUndefined("initial_comment"),
        threadTs: getInputOrUndefined("thread_ts"),
        title: getInputOrUndefined("title"),
        retries: getInputNumberOrUndefined("retries"),
        deleteFileIdBeforeUpload: getInputOrUndefined("delete_file_id_before_upload"),
    };
}

async function postByContent(client: slack.WebClient, option: Option): Promise<slack.FilesUploadResponse> {
    return await client.filesUploadV2({
        channel_id: option.channel_id,
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
    }

    const files: { file: Buffer; filename: string }[] = [];
    for (const filePath of filePaths) {
        files.push({ file: fs.readFileSync(filePath), filename: path.basename(filePath) });
    }

    return await client.filesUploadV2({
        channel_id: option.channel_id,
        initial_comment: option.initialComment,
        thread_ts: option.threadTs,
        file_uploads: files,
    });
}

async function deleteFile(client: slack.WebClient, fileId: string): Promise<void> {
    await client.files.delete({ file: fileId });
}

async function run() {
    try {
        const option = readOption();
        const client = new slack.WebClient(option.slackToken, {
            slackApiUrl: option.slackApiUrl,
            retryConfig: { retries: option.retries ?? defaultMaxRetryCount },
        });

        if (option.deleteFileIdBeforeUpload != undefined) {
            await deleteFile(client, option.deleteFileIdBeforeUpload);
        }

        const result =
            option.filePath == undefined ? await postByContent(client, option) : await postByFile(client, option);
        if (result.ok == false) {
            core.setFailed(result.error ?? "unknown error");
            return;
        }
        core.setOutput("response", JSON.stringify(result));
        core.setOutput("uploaded_file_id", result.file?.id ?? "");
        core.info(JSON.stringify(result));
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();
