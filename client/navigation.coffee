Accounts.onLogin ->
  user = Meteor.user()
  if(user.isBanned)
    #Logout on login
    Meteor.users.update({_id: user._id}, {$set : { "services.resume.loginTokens" : [] }})

Template.forumIndex.events
  'click .button-post': ->
    Router.go('/forum/post')
