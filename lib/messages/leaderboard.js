var AsciiTable = require('ascii-table');

/**
 * @param scoreboard - Array of {id,name,points}
 * @param title - Optional alternate title (defaults to `Current Stadings`)
 */
module.exports = function toLeaderBoardMessage(scoreboard, title){
  title = title || 'Current Standings';
  var table = new AsciiTable();
  table.setAlign(0, AsciiTable.RIGHT)
    .setAlign(1, AsciiTable.LEFT)
    .setAlign(2, AsciiTable.RIGHT);

  scoreboard.forEach(function(user, idx){
    table.addRow(idx+1, `<@${user.name}>`, `${user.points} pts`)
  });

  table.removeBorder();

  var message =  {attachments: [{
    fallback: "Visit channel for current standings.",
    pretext: `*${title}*`,
    text: '```\u200b'+table.toString()+'```',
    color: '#FD6729',
    thumb_url: "http://www.betbattle.com/wp-content/uploads/2014/05/leaderboard.png",
    mrkdwn_in: ["text", "pretext"]
  }]};
  return message;
}
