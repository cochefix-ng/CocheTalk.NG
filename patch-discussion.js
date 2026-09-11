const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/app/discussion/[id].tsx', 'utf8');

// Add import
const importStr = `import { FavoriteButton } from '@/components/FavoriteButton';\nimport { useApp } from '@/context/AppContext';`;
content = content.replace("import { useApp } from '@/context/AppContext';", importStr);

// Add to discussion postFooter
const replacement = `
            <View style={{ flexDirection: 'row', gap: 6 }}>
              <TouchableOpacity
                style={[styles.voteBtn, { backgroundColor: hasVoted ? colors.primary + '22' : colors.muted }]}
                onPress={() => currentUser && upvoteDiscussion(post.id)}
              >
                <Feather name="arrow-up" size={14} color={hasVoted ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.voteCount, { color: hasVoted ? colors.primaryText : colors.mutedForeground }]}>
                  {post.upvotes}
                </Text>
              </TouchableOpacity>
              <FavoriteButton contentType="discussion" contentId={post.id} />
            </View>
          </View>
        </View>
`;

content = content.replace(/<TouchableOpacity\s*style=\{\[styles\.voteBtn[\s\S]*?<\/TouchableOpacity>\s*<\/View>\s*<\/View>/, replacement.trim());

fs.writeFileSync('artifacts/cochetalk/app/discussion/[id].tsx', content);
