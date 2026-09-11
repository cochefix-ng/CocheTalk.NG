const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/app/listing/[id].tsx', 'utf8');

const importStr = `import { FavoriteButton } from '@/components/FavoriteButton';\nimport { makeConvId, useApp } from '@/context/AppContext';`;
content = content.replace("import { makeConvId, useApp } from '@/context/AppContext';", importStr);

const metaRow = `
        <View style={[styles.metaRow, { justifyContent: 'space-between' }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Feather name="map-pin" size={12} color={colors.mutedForeground} />
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{listing.location}</Text>
            <Text style={[styles.metaDot, { color: colors.mutedForeground }]}>·</Text>
            <Text style={[styles.metaText, { color: colors.mutedForeground }]}>{timeAgo(listing.timestamp)}</Text>
          </View>
          <FavoriteButton contentType="listing" contentId={listing.id} />
        </View>
`;

content = content.replace(/<View style=\{styles\.metaRow\}>[\s\S]*?<\/View>/, metaRow.trim());

fs.writeFileSync('artifacts/cochetalk/app/listing/[id].tsx', content);
