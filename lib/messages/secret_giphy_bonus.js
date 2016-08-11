module.exports = function(player, points, giphy){
  var message =  {
    attachments: [
      {
        fallback: "You've earned a bonus!",
        text: `<@${player.messaging_id}>: You've earned *${points}* bonus points. You've found the secret <${giphy.url}|giphy>!`,
        image_url: giphy.url,
        thumb_url: "http://30dayebook.com/wp-content/uploads/2014/01/bonus-red.png",
        color: '#FD6729',
        mrkdwn_in: ["text"]
      }
    ]
  };
  return message;
}
