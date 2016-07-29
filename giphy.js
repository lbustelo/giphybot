/*
Sample message
{ type: 'message',
  user: 'U07BYJPQD',
  text: '/giphy test1',
  team: 'T06J3E813',
  user_team: 'T06J3E813',
  user_profile:
   { avatar_hash: 'c5ed44a55fdc',
     image_72: 'https://avatars.slack-edge.com/2015-07-23/8117546752_c5ed44a55fdca3856e5f_72.jpg',
     first_name: 'Leugim',
     real_name: 'Leugim Bustelo',
     name: 'lbustelo' },
  attachments:
   [ { fallback: 'giphy: <http://giphy.com/gifs/test2-test1-hktqzH5bJIEiQ>',
       image_url: 'http://media3.giphy.com/media/hktqzH5bJIEiQ/giphy.gif',
       image_width: 403,
       image_height: 400,
       image_bytes: 126958,
       is_animated: true,
       title: 'test1',
       id: 1,
       title_link: 'http://giphy.com/gifs/test2-test1-hktqzH5bJIEiQ' } ],
  channel: 'D1VRK10QJ',
  ts: '1469712397.000010',
  event: 'direct_message',
  match: [ '/giphy test1', 'test1', index: 0, input: '/giphy test1' ] }
*/

module.exports.fromMessage = function(message){
  return new Giphy(message);
}

var Giphy = function(message){
  this.msg = message;
}

Giphy.prototype.channel = function(){
  return this.msg.channel;
}

Giphy.prototype.user = function(){
  return this.msg.user_profile.name;
}
