import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

import type { Answer, MarketplaceListing, ProviderRating, Question, User } from '@/context/AppContext';

function esc(val: unknown): string {
  const s = val == null ? '' : String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function rows(headers: string[], data: string[][]): string {
  return [headers, ...data].map((r) => r.map(esc).join(',')).join('\n');
}

function datestamp(): string {
  return new Date().toISOString().slice(0, 10);
}

async function triggerDownload(filename: string, csv: string): Promise<void> {
  if (Platform.OS === 'web') {
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } else {
    const path = `${FileSystem.cacheDirectory}${filename}`;
    await FileSystem.writeAsStringAsync(path, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(path, {
        mimeType: 'text/csv',
        dialogTitle: `Export ${filename}`,
        UTI: 'public.comma-separated-values-text',
      });
    }
  }
}

export async function exportUsersReport(
  users: User[],
  questions: Question[],
  answers: Answer[],
  listings: MarketplaceListing[],
  ratings: ProviderRating[],
): Promise<void> {
  const headers = [
    'Name',
    'Email',
    'Role',
    'Specialization',
    'Business Name',
    'Verified',
    'Banned',
    'Location',
    'Phone',
    'Experience (yrs)',
    'Questions Posted',
    'Answers Posted',
    'Listings Created',
    'Avg Rating',
    'Rating Count',
  ];

  const data = users.map((u) => {
    const userQs = questions.filter((q) => q.userId === u.id).length;
    const userAs = answers.filter((a) => a.userId === u.id).length;
    const userLs = listings.filter((l) => l.userId === u.id).length;
    const userRatings = ratings.filter((r) => r.providerId === u.id);
    const avgR =
      userRatings.length
        ? (userRatings.reduce((s, r) => s + r.ratingValue, 0) / userRatings.length).toFixed(2)
        : '';
    return [
      u.name,
      u.id,
      u.role,
      u.specialization ?? '',
      u.businessName ?? '',
      u.verified ? 'Yes' : 'No',
      u.isBanned ? 'Yes' : 'No',
      u.location ?? '',
      u.phone ?? '',
      String(u.experience ?? 0),
      String(userQs),
      String(userAs),
      String(userLs),
      avgR,
      String(userRatings.length),
    ];
  });

  await triggerDownload(`cochetalk_users_${datestamp()}.csv`, rows(headers, data));
}

export async function exportActivitiesReport(
  questions: Question[],
  answers: Answer[],
  listings: MarketplaceListing[],
  ratings: ProviderRating[],
): Promise<void> {
  const qHeaders = [
    'ID',
    'Title',
    'Author',
    'Vehicle',
    'Tags',
    'Upvotes',
    'Answer Count',
    'Has Accepted Answer',
    'Visibility',
    'Date',
  ];
  const qData = questions.map((q) => [
    String(q.id),
    q.title,
    q.userName,
    q.yrModel ?? '',
    q.tags,
    String(q.upvotes),
    String(answers.filter((a) => a.questionId === q.id).length),
    q.acceptedAnswerId ? 'Yes' : 'No',
    q.isPrivateEcosystem ? 'Pro Circle' : 'Public Forum',
    new Date(q.timestamp).toLocaleDateString(),
  ]);

  const aHeaders = ['ID', 'Question ID', 'Question Title', 'Author', 'Upvotes', 'Is Accepted', 'Date'];
  const aData = answers.map((a) => {
    const q = questions.find((q) => q.id === a.questionId);
    return [
      String(a.id),
      String(a.questionId),
      q?.title ?? '',
      a.userName,
      String(a.upvotes),
      q?.acceptedAnswerId === a.id ? 'Yes' : 'No',
      new Date(a.timestamp).toLocaleDateString(),
    ];
  });

  const lHeaders = [
    'ID',
    'Title',
    'Category',
    'Seller',
    'Price (NGN)',
    'Location',
    'Approved',
    'Featured',
    'Date',
  ];
  const lData = listings.map((l) => [
    String(l.id),
    l.title,
    l.category,
    l.userName,
    String(l.price),
    l.location,
    l.isApproved ? 'Yes' : 'No',
    l.isFeaturedBottom ? 'Yes' : 'No',
    new Date(l.timestamp).toLocaleDateString(),
  ]);

  const rHeaders = ['ID', 'Provider', 'Rated By', 'Rating', 'Feedback', 'Date'];
  const rData = ratings.map((r) => [
    String(r.id),
    r.providerId,
    r.raterName,
    String(r.ratingValue),
    r.feedback,
    new Date(r.timestamp).toLocaleDateString(),
  ]);

  const csv = [
    '=== QUESTIONS ===',
    rows(qHeaders, qData),
    '',
    '=== ANSWERS ===',
    rows(aHeaders, aData),
    '',
    '=== LISTINGS ===',
    rows(lHeaders, lData),
    '',
    '=== RATINGS ===',
    rows(rHeaders, rData),
  ].join('\n');

  await triggerDownload(`cochetalk_activities_${datestamp()}.csv`, csv);
}

export async function exportAnalyticsReport(
  users: User[],
  questions: Question[],
  answers: Answer[],
  listings: MarketplaceListing[],
  ratings: ProviderRating[],
): Promise<void> {
  const carOwners = users.filter((u) => u.role === 'Car Owner').length;
  const serviceProviders = users.filter((u) => u.role === 'Service Provider').length;
  const verifiedProviders = users.filter((u) => u.role === 'Service Provider' && u.verified).length;
  const bannedUsers = users.filter((u) => u.isBanned).length;

  const publicQs = questions.filter((q) => !q.isPrivateEcosystem).length;
  const proQs = questions.filter((q) => q.isPrivateEcosystem).length;
  const answeredQs = questions.filter((q) => answers.some((a) => a.questionId === q.id)).length;
  const acceptedQs = questions.filter((q) => q.acceptedAnswerId).length;
  const avgAnswers = questions.length
    ? (answers.length / questions.length).toFixed(2)
    : '0';

  const approvedListings = listings.filter((l) => l.isApproved).length;
  const pendingListings = listings.filter((l) => !l.isApproved).length;
  const featuredListings = listings.filter((l) => l.isFeaturedBottom).length;
  const partsListings = listings.filter((l) => l.category === 'Parts').length;
  const servicesListings = listings.filter((l) => l.category === 'Services').length;
  const carSalesListings = listings.filter((l) => l.category === 'Car Sales').length;
  const totalListingValue = listings
    .filter((l) => l.isApproved)
    .reduce((s, l) => s + l.price, 0);

  const avgRating = ratings.length
    ? (ratings.reduce((s, r) => s + r.ratingValue, 0) / ratings.length).toFixed(2)
    : '0';

  const topContributors = users
    .map((u) => ({
      name: u.name,
      score:
        questions.filter((q) => q.userId === u.id).length * 3 +
        answers.filter((a) => a.userId === u.id).length * 2 +
        listings.filter((l) => l.userId === u.id).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const metrics: [string, string][] = [
    ['=== PLATFORM OVERVIEW ===', ''],
    ['Report Generated', new Date().toLocaleString()],
    ['', ''],
    ['=== USERS ===', ''],
    ['Total Users', String(users.length)],
    ['Car Owners', String(carOwners)],
    ['Service Providers', String(serviceProviders)],
    ['Verified Providers', String(verifiedProviders)],
    ['Banned Users', String(bannedUsers)],
    ['', ''],
    ['=== Q&A ACTIVITY ===', ''],
    ['Total Questions', String(questions.length)],
    ['Public Forum Questions', String(publicQs)],
    ['Pro Circle Questions', String(proQs)],
    ['Questions with Answers', String(answeredQs)],
    ['Questions with Accepted Answer', String(acceptedQs)],
    ['Total Answers', String(answers.length)],
    ['Avg Answers per Question', avgAnswers],
    ['', ''],
    ['=== MARKETPLACE ===', ''],
    ['Total Listings', String(listings.length)],
    ['Approved Listings', String(approvedListings)],
    ['Pending Listings', String(pendingListings)],
    ['Featured (Forum Banner)', String(featuredListings)],
    ['Parts Listings', String(partsListings)],
    ['Services Listings', String(servicesListings)],
    ['Car Sales Listings', String(carSalesListings)],
    ['Total Approved Listing Value (NGN)', `₦${totalListingValue.toLocaleString()}`],
    ['', ''],
    ['=== RATINGS ===', ''],
    ['Total Ratings', String(ratings.length)],
    ['Average Rating', avgRating],
    ['', ''],
    ['=== TOP CONTRIBUTORS (by score) ===', ''],
    ...topContributors.map((c, i) => [`#${i + 1} ${c.name}`, `Score: ${c.score}`] as [string, string]),
  ];

  const csv = metrics.map(([k, v]) => `${esc(k)},${esc(v)}`).join('\n');
  await triggerDownload(`cochetalk_analytics_${datestamp()}.csv`, csv);
}

export async function exportListingsReport(listings: MarketplaceListing[]): Promise<void> {
  const headers = [
    'ID',
    'Title',
    'Category',
    'Seller Name',
    'Seller Email',
    'Price (NGN)',
    'Location',
    'Brand',
    'Application',
    'Parts Grade',
    'Car Make',
    'Car Model',
    'Car Year',
    'Car Trim',
    'Car Condition',
    'Car Mileage (km)',
    'Car Transmission',
    'Car Fuel Type',
    'Car Body Type',
    'Car Drive Type',
    'Car Engine',
    'Car Exterior Colour',
    'Car Interior Colour',
    'Accident History',
    'Service History',
    'Previous Owners',
    'Registration Status',
    'Customs Papers',
    'VIN',
    'Plate Number',
    'Approved',
    'Featured on Banner',
    'Date Listed',
  ];

  const data = listings.map((l) => [
    String(l.id),
    l.title,
    l.category,
    l.userName,
    l.userId,
    String(l.price),
    l.location,
    l.partBrand ?? '',
    l.application ?? '',
    l.partsGrade ?? '',
    l.carMake ?? '',
    l.carModel ?? '',
    l.carYear ? String(l.carYear) : '',
    l.carTrim ?? '',
    l.carCondition ?? '',
    l.carMileage != null ? String(l.carMileage) : '',
    l.carTransmission ?? '',
    l.carFuelType ?? '',
    l.carBodyType ?? '',
    l.carDriveType ?? '',
    l.carEngineType ?? '',
    l.carExteriorColor ?? '',
    l.carInteriorColor ?? '',
    l.carAccidentHistory ?? '',
    l.carServiceHistory ?? '',
    l.carPreviousOwners != null ? String(l.carPreviousOwners) : '',
    l.carRegistrationStatus ?? '',
    l.carCustomsPapers ?? '',
    l.carVin ?? '',
    l.carPlateNumber ?? '',
    l.isApproved ? 'Yes' : 'No',
    l.isFeaturedBottom ? 'Yes' : 'No',
    new Date(l.timestamp).toLocaleDateString(),
  ]);

  await triggerDownload(`cochetalk_listings_${datestamp()}.csv`, rows(headers, data));
}
