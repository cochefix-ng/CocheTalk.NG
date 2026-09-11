const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

// Fix typing for answersArr
content = content.replace('const answersArr = [];', 'const answersArr: Answer[] = [];');
content = content.replace('const commentsArr = [];', 'const commentsArr: Comment[] = [];');
content = content.replace('const discussionCommentsArr = [];', 'const discussionCommentsArr: DiscussionComment[] = [];');
content = content.replace("role: 'Admin',", "role: 'Admin' as UserRole,");

// Remove { data: ... }
content = content.replace(/await createQuestion\(\{ data: \{/g, 'await createQuestion({');
content = content.replace(/await createAnswer\(questionId, \{ data: \{/g, 'await createAnswer(questionId, {');
content = content.replace(/await createAnswerComment\(parentId, \{ data: \{/g, 'await createAnswerComment(parentId, {');
content = content.replace(/await createQuestionComment\(parentId, \{ data: \{/g, 'await createQuestionComment(parentId, {');
content = content.replace(/await createDiscussionApi\(\{ data: \{/g, 'await createDiscussionApi({');
content = content.replace(/await createDiscussionComment\(postId, \{ data: \{/g, 'await createDiscussionComment(postId, {');
content = content.replace(/await createListingApi\(\{ data: \{/g, 'await createListingApi({');
content = content.replace(/await setListingApproval\(id, \{ data: \{/g, 'await setListingApproval(id, {');
content = content.replace(/await setListingFeatured\(id, \{ data: \{/g, 'await setListingFeatured(id, {');

// Fix all closing brackets for those calls
content = content.replace(/userVerified: currentUser.verified,\n        } \}\);/g, 'userVerified: currentUser.verified,\n        });');
content = content.replace(/userName: currentUser.name \} \}\);/g, 'userName: currentUser.name });');
content = content.replace(/userPhone: currentUser.phone,\n        } \}\);/g, 'userPhone: currentUser.phone,\n        });');
content = content.replace(/\{ approved \} \}\);/g, '{ approved });');
content = content.replace(/\{ featured \} \}\);/g, '{ featured });');

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
