# slack-upload-file
[![CI-Master](https://github.com/MeilCli/slack-upload-file/actions/workflows/ci-master.yml/badge.svg)](https://github.com/MeilCli/slack-upload-file/actions/workflows/ci-master.yml)  
upload file to slack action

## Example
```yaml
name: Slack

on:
  workflow_dispatch:
    inputs:
      message: 
        description: 'post message as text file to slack'
        required: true
        default: 'Hello World!'

jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - run: 'echo ${{ github.event.inputs.message }} > message.txt'
      - uses: MeilCli/slack-upload-file@v2
        with:
          slack_token: ${{ secrets.SLACK_TOKEN }}
          channels: ${{ secrets.SLACK_CHANNELS }}
          file_path: 'message.txt'
          file_type: 'text'
          initial_comment: 'post by slack-upload-file'
```
You can also pin to a [specific release](https://github.com/MeilCli/slack-upload-file/releases) version in the format `@v2.x.x`

## Information
- This action execute simply [files.upload](https://api.slack.com/methods/files.upload), and can upload multiple files by [glob pattern](https://github.com/actions/toolkit/tree/main/packages/glob#patterns)
- How get slack token? see [Basic app setup](https://api.slack.com/authentication/basics)
- How choose Oauth Scope? This action require only `files:write`. In simply case, you do choose `files:write` Bot Token Scope.

## Input
- `slack_token`
  - required
  - Slack token, must has files:write permission
- `slack_api_url`
  - Custom slack api url
- `channel_id`
  - Slack channel id
- `content`
  - File contents via a POST variable. If omitting this parameter, you must provide a `file`.
- `file_path`
  - File contents via multipart/form-data. If omitting this parameter, you must submit `content`.
  - You can use [glob pattern](https://github.com/actions/toolkit/tree/main/packages/glob#patterns)
- `file_path_follow_symbolic_links`
  - Indicates whether to follow symbolic links
  - This parameter only use glob pattern
  - default: true
- `file_name`
  - Filename of file.
  - This parameter can only use providing `content`
- `file_type`
  - A file type identifier.
  - ref: [https://api.slack.com/types/file#file_types](https://api.slack.com/types/file#file_types)
- `initial_comment`
  - The message text introducing the file in specified channels.
- `thread_ts`
  - Provide another message's ts value to upload this file as a reply. Never use a reply's ts value; use its parent instead.
- `title`
  - Title of file.
- `retries`
  - max API retry count. default retries is 3.
- `delete_file_id_before_upload`
  - file deletion before upload. this argument is purpose for previous uploaded file replacement.

## Output
- `response`
  - the api response
- `uploaded_file_id`
  - uploaded file id

### Example
```yaml
jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - run: 'echo ${{ github.event.inputs.message }} > message.txt'
      - uses: MeilCli/slack-upload-file@v2
        id: message
        with:
          slack_token: ${{ secrets.SLACK_TOKEN }}
          channel_id: ${{ secrets.SLACK_CHANNEL_ID }}
          file_path: 'message.txt'
          file_type: 'text'
          initial_comment: 'post by slack-upload-file'
      - run: 'echo ${{ fromJson(steps.message.outputs.response).file.permalink }}'
```

## Contributes
[<img src="https://gist.github.com/MeilCli/9851a2980ae568e93042315ec2b43588/raw/859ead0ea54e1a8e943b575937bdc0e3c54bf0ac/metrics_contributors.svg">](https://github.com/MeilCli/slack-upload-file/graphs/contributors)

### Could you want to contribute?
see [Contributing.md](./.github/CONTRIBUTING.md)

## License
[<img src="https://gist.github.com/MeilCli/9851a2980ae568e93042315ec2b43588/raw/859ead0ea54e1a8e943b575937bdc0e3c54bf0ac/metrics_licenses.svg">](LICENSE.txt)

### Using
- [actions/toolkit](https://github.com/actions/toolkit), published by [MIT License](https://github.com/actions/toolkit/blob/master/LICENSE.md)
- [slackapi/node-slack-sdk](https://github.com/slackapi/node-slack-sdk), published by [MIT License](https://github.com/slackapi/node-slack-sdk/blob/main/LICENSE)
