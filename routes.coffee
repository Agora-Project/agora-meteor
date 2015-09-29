subs = new SubsManager
  cacheLimit: 10, # Maximum number of cache subscriptions
  expireIn: 5 # Any subscription will be expire after 5 minute, if it's not subscribed again

Router.onBeforeAction ->
  if Meteor.user() && Meteor.user().isBanned
    this.render('forbidden')
  else
    this.next()

Router.route '/forum',
  name: 'forumIndex'
  template: 'forumIndex'

Router.route '/forum/post',
  name: 'forumPost'
  template: 'forumPost'

Router.route '/forum/users',
  name: 'forumUsers'
  template: 'forumUsers'
