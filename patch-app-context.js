const fs = require('fs');

let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

// I need to add imports for API client hooks
const imports = `import {
  listQuestions, listDiscussions, listListings, listQuestionAnswers,
  listQuestionComments, listAnswerComments, listDiscussionComments,
  createQuestion, deleteQuestion, upvoteQuestion, createAnswer, deleteAnswer,
  upvoteAnswer, acceptQuestionAnswer, createDiscussion, deleteDiscussion,
  upvoteDiscussion, createListing, deleteListing, setListingApproval,
  setListingFeatured, createQuestionComment, createAnswerComment,
  createDiscussionComment
} from '@workspace/api-client-react';\n`;

content = content.replace("import React,", imports + "import React,");

// Next, let's write the patching logic for createSeedState.
// We remove the seed data for questions, answers, discussions, etc.
const createSeedStateRegex = /function createSeedState\(\): AppState \{[\s\S]*?return \{([\s\S]*?)\};\n\}/;
content = content.replace(createSeedStateRegex, (match, p1) => {
  return `function createSeedState(): AppState {
  const users = [
    {
      id: 'admin@cochetalk.com',
      name: 'Chief Admin',
      email: 'admin@cochetalk.com',
      role: 'Admin',
      verified: true,
      phone: '+2348099999999',
      specialization: [],
      businessName: '',
      experience: 0,
      location: 'Lagos',
      isBanned: false,
    }
  ];
  return {
    users,
    questions: [],
    answers: [],
    comments: [],
    discussions: [],
    discussionComments: [],
    listings: [],
    ratings: [],
    analytics: createSeedAnalytics(),
    cmsConfig: {
      announcementText: "Welcome to CocheTalk.NG — Nigeria's trusted vehicle aftersales platform!",
      announcementActive: true,
      featuredPartsLabel: 'Top Rated Parts',
      featuredServicesLabel: 'Verified Mechanic Services',
      specializationTags: [
        'Engine', 'Transmission', 'Electrical Systems', 'Brakes',
        'Tyres & Suspension', 'Body & Paint', 'Air Conditioning',
        'Welding', 'Diagnostics', 'General Repairs',
      ],
      marketplaceVisible: true,
      clinicVisible: true,
    },
    currentUserId: null,
    messages: [],
    conversations: [],
  };
}`;
});

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
