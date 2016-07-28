# giphybot

`giphybot` is a Slack bot that listens on a channel to `giphy` activity. It records and reports statistics.

#### To Run
All parameters to `giphybot` are sent through environment variables.

```
SLACK_TOKEN=<Slack Token> \
BOT_MASTER=<User Id> \
node robot.js
```

#### Environment

- `SLACK_TOKEN`: Token for the bot configured [here](https://my.slack.com/services/new/bot)
- `BOT_MASTER`: Slack ID for user. (Currently the alpha-numerical ID, not the @name.
- `GLOBAL_THRESHOLD`: Number that determines when to level up
