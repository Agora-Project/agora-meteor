Meteor.startup ->
  if (!Argument.findOne({isRoot: true}))
    console.log("Adding root argument")
    Argument.insert(title: 'Forum', isRoot: true)

  moderatorEmail = "moderator@example.com";
  if (!Meteor.users.findOne("emails.address" : moderatorEmail))
    console.log("Adding default moderator")
    moderatorId = Accounts.createUser
      email: moderatorEmail,
      password: "mod1pass",
      profile:
        name: "Moderator"
    Roles.addUsersToRoles(moderatorId, ['moderator'])
