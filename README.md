# slack-upload-file
![CI](https://github.com/MeilCli/slack-upload-file/workflows/CI/badge.svg)  
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
      - uses: MeilCli/slack-upload-file@v1
        with:
          slack_token: ${{ secrets.SLACK_TOKEN }}
          channels: ${{ secrets.SLACK_CHANNELS }}
          file_path: 'message.txt'
          file_name: 'message.txt'
          file_type: 'text'
          initial_comment: 'post by slack-upload-file'
```
You can also pin to a [specific release](https://github.com/MeilCli/slack-upload-file/releases) version in the format `@v1.x.x`

## Information
- This action execute simply [files.upload](https://api.slack.com/methods/files.upload)
- How get slack token? see [Basic app setup](https://api.slack.com/authentication/basics)
- How choose Oauth Scope? This action require only `files:write`. In simply case, you do choose `files:write` Bot Token Scope.

## Input
- `slack_token`
  - required
  - Slack token, must has files:write permission
- `slack_api_url`
  - Custom slack api url
- `channels`
  - Comma-separated list of channel names or IDs where the file will be shared.
- `content`
  - File contents via a POST variable. If omitting this parameter, you must provide a file.
- `file_path`
  - File contents via multipart/form-data. If omitting this parameter, you must submit content.
- `file_name`
  - Filename of file.
- `file_type`
  - A file type identifier.
  - ref: [https://api.slack.com/types/file#file_types](https://api.slack.com/types/file#file_types)
- `initial_comment`
  - The message text introducing the file in specified channels.
- `thread_ts`
  - Provide another message's ts value to upload this file as a reply. Never use a reply's ts value; use its parent instead.
- `title`
  - Title of file.

## Output
- `response`
  - the api response

### Example
```yaml
jobs:
  post:
    runs-on: ubuntu-latest
    steps:
      - run: 'echo ${{ github.event.inputs.message }} > message.txt'
      - uses: MeilCli/slack-upload-file@v1
        id: message
        with:
          slack_token: ${{ secrets.SLACK_TOKEN }}
          channels: ${{ secrets.SLACK_CHANNELS }}
          file_path: 'message.txt'
          file_name: 'message.txt'
          file_type: 'text'
          initial_comment: 'post by slack-upload-file'
      - run: 'echo ${{ fromJson(steps.message.outputs.response).file.permalink }}'
```

## License
MIT License

### Using
- [actions/toolkit](https://github.com/actions/toolkit), published by [MIT License](https://github.com/actions/toolkit/blob/master/LICENSE.md)
- [slackapi/node-slack-sdk](https://github.com/slackapi/node-slack-sdk), published by [MIT License](https://github.com/slackapi/node-slack-sdk/blob/main/LICENSE)
