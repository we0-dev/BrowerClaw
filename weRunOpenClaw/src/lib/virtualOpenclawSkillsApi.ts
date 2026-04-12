/**
 * 虚拟 OpenClaw 技能：供 UI 或其他模块使用的稳定入口。
 * - 读取内置技能目录、持久化用户开关与 SKILL.md 覆盖
 * - 将偏好应用到 weNode 内 openclaw workspace + openclaw.json
 */
export {
  getBundledSkillCatalog,
  parseSkillNameFromSkillMd,
  type BundledSkillRow,
} from "./bundledOpenclawSkillCatalog";
export {
  loadVirtualSkillsPrefs,
  saveVirtualSkillsPrefs,
  type VirtualSkillsPrefsV1,
} from "./opfsVirtualSkillsStore";
export { applyVirtualOpenclawSkillsToWeNode } from "./applyVirtualOpenclawSkills";
export {
  OPENCLAW_CONFIG_VFS_PATH,
  OPENCLAW_WORKSPACE_SKILLS_VFS_ROOT,
} from "./openclawVfsPaths";
