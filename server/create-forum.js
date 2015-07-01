Meteor.startup(function() {
    if (!Argument.findOne({isRoot: true})){
        console.log("Adding root argument")
        Argument.insert({title: 'Forum', isRoot: true});
    }
});
