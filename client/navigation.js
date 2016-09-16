Accounts.onLogin = function() {
  user = Meteor.user()
  if(user.isBanned) {
    //Logout on login
    Meteor.users.update({_id: user._id}, {$set : { "services.resume.loginTokens" : [] }})
  }
};

Template.forumIndex.helpers({
  checkIfModerator: function() {
    return Roles.userIsInRole(Meteor.userId(), ['moderator']);
  }

});
