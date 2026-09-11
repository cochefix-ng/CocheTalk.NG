const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/app/(tabs)/profile.tsx', 'utf8');

const regex = /<TouchableOpacity\s+style=\{\[styles\.actionBtn, \{ backgroundColor: colors\.muted, borderColor: colors\.border \}\]\}\s+onPress=\{\(\) => setShowSwitchModal\(true\)\}\s+>/;

const favoritesButton = `
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => router.push('/favorites')}
        >
          <Feather name="bookmark" size={16} color={colors.foreground} />
          <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Favorites</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.actionChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted, borderColor: colors.border }]}
          onPress={() => setShowSwitchModal(true)}
        >
`;

content = content.replace(regex, favoritesButton.trim());

fs.writeFileSync('artifacts/cochetalk/app/(tabs)/profile.tsx', content);
