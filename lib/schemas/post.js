this.Schema || (this.Schema = {});

this.Schema.Link = new SimpleSchema({
    target: {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    isAttack: {
        type: Boolean,
        optional: true
    }
});

this.Schema.Post = new SimpleSchema({
    posterID: {
        type: String,
        regEx: SimpleSchema.RegEx.Id,
        optional: true
    },
    title: {
        type: String
    },
    content: {
        type: String,
        optional: true
    },
    links: {
        type: [this.Schema.Link]
    },
    replyIDs: {
        type: Array,
        optional: true
    },
    'replyIDs.$': {
        type: String,
        regEx: SimpleSchema.RegEx.Id
    },
    postedOn: {
        type: Date,
        optional: true
    },
    lastEditedOn: {
        type: Date,
        optional: true
    },
    isLocked: {
        type: Boolean,
        optional: true,
    }
});

this.Post = new Mongo.Collection('posts');

this.Post.attachSchema(this.Schema.Post);

this.Post.before.insert(function(userId, post) {
    post.posterID = userId;
    if (!post.replyIDs) post.replyIDs = [];
    post.postedOn = Date.now();
});

if (Meteor.isServer) {
    this.Post.after.insert(function(userId, post) {
        if (post.title.length < 1) return [];
        var i, len, link, ref, results, type;

        if (post.isAttack) {
            type = "Attack";
        } else {
            type = "Normal";
        }
        if (post.links.length > 0) {
            ref = post.links;
            results = [];
            for (i = 0, len = ref.length; i < len; i++) {
                link = ref[i];
                results.push(Meteor.call('insertLink', {
                    type: type,
                    sourceId: post._id,
                    targetId: link,
                    ownerId: post.ownerId
                }));
            }
            return results;
        }
    });
}
