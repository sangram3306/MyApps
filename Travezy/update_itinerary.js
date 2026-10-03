const fs = require('fs');
let code = fs.readFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/itinerary.tsx', 'utf8');

// 1. Update isCollapsed logic
code = code.replace(
  "const isCollapsed = isCityGroup && collapsedCities.has(group.cityName!);",
  "const isCollapsed = isCityGroup && (state.settings.multiScreenItinerary || collapsedCities.has(group.cityName!));"
);

// 2. Add isNavigable to TimelineItem
code = code.replace(
  "isCollapsed={item.vEntry.virtualType === 'city-header' ? collapsedCities.has(item.vEntry.cityName!) : item.isCollapsed}",
  "isCollapsed={item.vEntry.virtualType === 'city-header' ? (state.settings.multiScreenItinerary || collapsedCities.has(item.vEntry.cityName!)) : item.isCollapsed}\n                isNavigable={item.vEntry.virtualType === 'city-header' && state.settings.multiScreenItinerary}"
);

// 3. Update onToggleCollapse logic
code = code.replace(
  "if (item.vEntry.virtualType === 'city-header') {\n                    toggleCollapseCity(item.vEntry.cityName!);",
  "if (item.vEntry.virtualType === 'city-header') {\n                    if (state.settings.multiScreenItinerary) {\n                      router.push({\n                        pathname: '/city-details',\n                        params: {\n                          tripId: activeTrip.id,\n                          cityName: item.vEntry.cityName\n                        }\n                      });\n                    } else {\n                      toggleCollapseCity(item.vEntry.cityName!);\n                    }"
);

fs.writeFileSync('/Users/sangram/Workspaces/MyApps/Travezy/app/(tabs)/itinerary.tsx', code);
console.log('Success');
