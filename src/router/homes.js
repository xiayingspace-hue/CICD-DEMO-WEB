// 角色 → 首页。路径以 CONTEXT 的 requirements/shared/ROLES.md 为准（CONTEXT#4、#6 PM 已确认）
export const HOME_BY_ROLE = {
  OWNER: { name: 'home-owner', path: '/owner/home', title: '屋主首页' },
  CSO: { name: 'home-cso', path: '/cso/home', title: 'CSO 首页' },
  SUBCONTRACTOR: { name: 'home-sub', path: '/sub/home', title: '分包首页' },
}
