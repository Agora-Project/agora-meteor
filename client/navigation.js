Accounts.onLogin = function() {
  user = Meteor.user()
  if(user.isBanned) {
    //Logout on login
    Meteor.users.update({_id: user._id}, {$set : { "services.resume.loginTokens" : [] }})
  }
};

Template.forumIndex.events({
  'click .button-post': function() {
    if (Object.keys(Session.get('selectedTargets')).length > 0)
      Router.go('/forum/post');
  }
});

Template.forumIndex.helpers({
  checkIfModerator: function() {
    return Roles.userIsInRole(Meteor.userId(), ['moderator']);
  }

});
