const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/app/(tabs)/profile.tsx', 'utf8');

const favoritesButton = `
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          onPress={() => router.push('/favorites')}
        >
          <Feather name="bookmark" size={16} color={colors.foreground} />
          <Text style={[styles.actionBtnText, { color: colors.foreground }]}>Favorites</Text>
          <Feather name="chevron-right" size={16} color={colors.mutedForeground} style={styles.actionChevron} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: colors.muted }]}
          onPress={() => setShowSwitchModal(true)}
`;

content = content.replace(/<TouchableOpacity[\s\S]*?onPress=\{\(\) => setShowSwitchModal\(true\)\}/, favoritesButton.trim());

fs.writeFileSync('artifacts/cochetalk/app/(tabs)/profile.tsx', content);
