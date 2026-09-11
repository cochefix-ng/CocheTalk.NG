const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/app/question/[id].tsx', 'utf8');

// Add import
const importStr = `import { FavoriteButton } from '@/components/FavoriteButton';\nimport { useApp } from '@/context/AppContext';`;
content = content.replace("import { useApp } from '@/context/AppContext';", importStr);

// Add to question voteRow
const questionBtn = `
                <Feather name="message-circle" size={14} color={colors.mutedForeground} />
                <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>Comment</Text>
              </TouchableOpacity>
              <FavoriteButton contentType="question" contentId={question.id} />
`;
content = content.replace(/<Feather name="message-circle" size=\{14\} color=\{colors\.mutedForeground\} \/>\s*<Text style=\{\[styles\.voteCount\, \{ color: colors\.mutedForeground \}\]\}>Comment<\/Text>\s*<\/TouchableOpacity>/, questionBtn.trim());

// Add to answer voteRow
const answerBtn = `
                  <Feather name="message-circle" size={13} color={colors.mutedForeground} />
                  <Text style={[styles.voteCount, { color: colors.mutedForeground }]}>
                    {answerComments.length > 0 ? \`\${answerComments.length}\` : 'Comment'}
                  </Text>
                </TouchableOpacity>
                <FavoriteButton contentType="answer" contentId={answer.id} />
`;
content = content.replace(/<Feather name="message-circle" size=\{13\} color=\{colors\.mutedForeground\} \/>\s*<Text style=\{\[styles\.voteCount\, \{ color: colors\.mutedForeground \}\]\}>\s*\{answerComments\.length > 0 \? \`\$\{answerComments\.length\}\` : 'Comment'\}\s*<\/Text>\s*<\/TouchableOpacity>/, answerBtn.trim());

fs.writeFileSync('artifacts/cochetalk/app/question/[id].tsx', content);
