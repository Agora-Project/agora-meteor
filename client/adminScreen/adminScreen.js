Template.adminScreen.onCreated(function() {
    this.subscribe('reports');
});

Template.adminScreen.helpers({
    reports: function() {
        return Reports.find({$where: "!this.resolved"});
    }
});

Template.adminScreen.events({
});


Template.report.helpers({
    post: function() {
        let post = Posts.findOne({_id: Template.currentData().targetID});
        return post;
    },
    postPreview: function() {
        let post = Posts.findOne({_id: Template.currentData().targetID});

        if(!post) return;

        if (post.title) return post.title.slice(0, 10);
        else {
            let rawContent = post.content;
            let bbcontent, finalContent = "";
            if (rawContent) {
                bbcontent = XBBCODE.process({
                    text: rawContent,
                    removeMisalignedTags: false,
                    addInLineBreaks: true
                }).html;

                let insideTags = 0, characters = 10

                while (bbcontent.length > 0) {

                    if (bbcontent[0] == '<') insideTags++;

                    if (characters > 0 && insideTags < 1) {
                        if (bbcontent[0] != '\n') finalContent = finalContent + bbcontent[0];
                        else finalContent = finalContent + ' ';
                    }

                    if (insideTags <= 0) characters--;

                    if (bbcontent[0] == '>') insideTags--;

                    bbcontent = bbcontent.substr(1, bbcontent.length - 1);

                }

                return finalContent;
            }

        }

    },
    user: function() {
        return Meteor.users.findOne(Template.currentData().userID);
    }
});

Template.report.onCreated(function() {
    this.subscribe('post', this.data.targetID, this.data.userID);
});

Template.report.events({
    "click .report-resolve-button": function(event) {
        Meteor.call("resolveReport", this);
    }
});
