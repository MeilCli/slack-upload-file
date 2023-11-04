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
    ifNoFilesFound: string | undefined;
    initialComment: string | undefined;
    threadTs: string | undefined;
    title: string | undefined;
    retries: number | undefined;
    deleteFileIdsBeforeUpload: string[] | undefined;
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
        ifNoFilesFound: getInputOrUndefined("if_no_files_found"),
        initialComment: getInputOrUndefined("initial_comment"),
        threadTs: getInputOrUndefined("thread_ts"),
        title: getInputOrUndefined("title"),
        retries: getInputNumberOrUndefined("retries"),
        deleteFileIdsBeforeUpload: getInputOrUndefined("delete_file_id_before_upload")?.split(","),
    };
}

// return if true: don't file-base uploading or file provided
async function validateFileProvided(option: Option): Promise<boolean> {
    if (option.filePath == undefined) {
        return true;
    }
    const globber = await glob.create(option.filePath, { followSymbolicLinks: option.filePathFollowSymbolicLinks });
    const filePaths = await globber.glob();
    if (filePaths.length == 0) {
        if (option.ifNoFilesFound == "warn") {
            core.warning(`file cannot find, path: ${option.filePath}`);
            return false;
        } else if (option.ifNoFilesFound == "ignore") {
            return false;
        } else {
            throw Error(`file cannot find, path: ${option.filePath}`);
        }
    }
    return true;
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

async function deleteFiles(client: slack.WebClient, fileIds: string[]): Promise<void> {
    for (const fileId of fileIds) {
        await client.files.delete({ file: fileId });
    }
}

async function run() {
    try {
        const option = readOption();
        const client = new slack.WebClient(option.slackToken, {
            slackApiUrl: option.slackApiUrl,
            retryConfig: { retries: option.retries ?? defaultMaxRetryCount },
        });

        const validateFileProviding = await validateFileProvided(option);
        if (validateFileProviding == false) {
            return;
        }

        if (option.deleteFileIdsBeforeUpload != undefined) {
            await deleteFiles(client, option.deleteFileIdsBeforeUpload);
        }

        const result =
            option.filePath == undefined ? await postByContent(client, option) : await postByFile(client, option);
        if (result.ok == false) {
            core.setFailed(result.error ?? "unknown error");
            return;
        }

        const response = result as unknown as { files: { files: { id: string }[] }[] };
        core.setOutput("response", JSON.stringify(result));
        core.setOutput("uploaded_file_ids", response.files.flatMap((x) => x.files.map((y) => y.id)).join(","));
    } catch (error) {
        if (error instanceof Error) {
            core.setFailed(error.message);
        }
    }
}

run();
