Accounts.onLogin ->
  user = Meteor.user()
  if(user.isBanned)
    #Logout on login
    Meteor.users.update({_id: user._id}, {$set : { "services.resume.loginTokens" : [] }})

Template.layout.events
  'click .button-post': ->
    Router.go('/post')
  'click .button-users': ->
    Router.go('/users')
  'click .button-home': ->
    Router.go('/');
  'click #at-nav-button': ->
    Router.go('/login');
