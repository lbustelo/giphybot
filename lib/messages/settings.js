var AsciiTable = require('ascii-table');

/**
 * @param settings - key/value pairs of settings
 */
module.exports = function(game, settings){
  var title = `Game ${game.id} Settings`;
  var table = new AsciiTable();
  table.setAlign(0, AsciiTable.LEFT)
    .setAlign(1, AsciiTable.LEFT);

  Object.keys(settings).sort().forEach(
    function(settingkey){
        table.addRow(settingkey, settings[settingkey]);
    }
  );

  table.removeBorder();

  var message =  {attachments: [{
    fallback: "Game settings.",
    pretext: `*${title}*`,
    text: '```\u200b'+(table.toString()||'empty')+'```',
    color: '#FD6729',
    thumb_url: "https://d13yacurqjgara.cloudfront.net/users/113259/screenshots/1188527/settings_big_1x.png",
    mrkdwn_in: ["text", "pretext"]
  }]};
  return message;
}
