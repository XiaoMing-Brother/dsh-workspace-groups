window.__ModuleLoader__.load({
	id: "dsh-workspace-groups",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const storeLib = require("@deepseek-ai/dsh-client-store");
		const primitives = require("@deepseek-ai/dsh-client-ui-primitives");

		let reactDom = null;
		try {
			reactDom = require("react-dom");
		} catch {
			reactDom = null;
		}

		const h = react.createElement;
		const PERSIST_KEY = ["dsh", "workspace", "groups", "v1"].join(".");
		const UNGROUPED = "__ungrouped__";
		const LOG_PREFIX = "[workspace-groups]";
		const EMPTY_MAP = /* @__PURE__ */ new Map();
		const EMPTY_LIST = /* @__PURE__ */ Object.freeze([]);

		//#region icons (fall back to a transparent glyph when a name is missing)
		const icon = (name, size) => {
			const Cmp = primitives[name];
			return typeof Cmp === "function" ? h(Cmp, { size: size ?? 16 }) : null;
		};
		const IconFolderOpen = (size) => icon("IconFolderOpenRegular", size);
		const IconFolderClose = (size) => icon("IconFolderCloseRegular", size);
		const IconChevron = (open) => h("span", { className: "wg-chev" + (open ? " wg-chev-open" : "") }, icon("IconTriangleRightFillRegular", 10));
		const IconAddFolder = (size) => icon("IconProjectAddOutlineRegular", size ?? 16);
		const IconGroupAdd = (size) => icon("IconAppsAddOutlineRegular", size ?? 16);
		const IconSearch = (size) => icon("IconSearchOutlineRegular", size ?? 16);
		const IconViewOpts = (size) => icon("IconSlidersTwoOutlineRegular", size ?? 16);
		const IconAdd = (size) => icon("IconPlusOutlineRegular", size ?? 14);
		const IconMore = (size) => icon("IconEllipsisOutlineRegular", size ?? 16);
		const IconEdit = (size) => icon("IconEditOutlineRegular", size ?? 14);
		const IconTrash = (size) => icon("IconTrashOutlineRegular", size ?? 14);
		const IconClose = (size) => icon("IconCloseFillRegular", size ?? 14);
		//#endregion

		//#region styles
		const CSS = `
.wg-root{display:flex;flex-direction:column;min-height:0;height:100%;padding:2px 0 0;color:var(--dsw-alias-label-primary)}
.wg-header{display:flex;align-items:center;gap:6px;padding:2px 10px 6px 12px;min-height:26px}
.wg-header-title{font-size:12px;font-weight:500;letter-spacing:.02em;color:var(--dsw-alias-label-secondary);flex:1 1 auto;user-select:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wg-header-actions{display:flex;align-items:center;gap:4px;flex:none}
.wg-search{display:flex;align-items:center;gap:6px;margin:0 10px 6px 12px;height:28px;padding:0 8px;border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-interactive-bg-hover,rgba(0,0,0,.045))}
.wg-search-icon{display:inline-flex;align-items:center;color:var(--dsw-alias-label-tertiary,#9aa0aa);flex:none}
.wg-search-input{flex:1 1 auto;min-width:0;height:24px;border:0;background:transparent;outline:none;font:inherit;font-size:12.5px;color:inherit}
.wg-iconbtn{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer;flex:none}
.wg-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover)}
.wg-list{flex:1 1 auto;min-height:0;overflow-y:auto;overflow-x:hidden;padding:0 6px 12px}
.wg-group{margin-bottom:6px;border-radius:var(--dsw-radius-sm,6px)}
.wg-group-row{display:flex;align-items:center;gap:6px;min-height:30px;padding:0 6px 0 4px;border-radius:var(--dsw-radius-sm,6px);cursor:default;user-select:none}
.wg-group-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.wg-group-row.wg-drop{background:var(--dsw-alias-interactive-bg-hover);box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary,#4d6bfe)}
.wg-chev{display:inline-flex;align-items:center;justify-content:center;width:14px;height:14px;flex:none;color:var(--dsw-alias-label-secondary);transition:transform .15s ease}
.wg-chev-open{transform:rotate(90deg)}
.wg-folder{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:none;color:var(--dsw-alias-label-secondary)}
.wg-title{font-size:13px;line-height:18px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.wg-group-row .wg-title{font-weight:500}
.wg-count{font-size:11px;color:var(--dsw-alias-label-tertiary,#9aa0aa);flex:none;padding-left:4px;font-variant-numeric:tabular-nums}
.wg-actions{display:none;align-items:center;gap:1px;flex:none}
.wg-group-row:hover .wg-actions,.wg-ws-row:hover .wg-actions,.wg-session-row:hover .wg-actions{display:inline-flex}
.wg-group-row:hover .wg-count,.wg-ws-row:hover .wg-count{display:none}
.wg-ws-row{display:flex;align-items:center;gap:6px;min-height:28px;margin-top:12px;padding:0 6px 0 18px;border-radius:var(--dsw-radius-sm,6px);cursor:default;user-select:none}
.wg-group-row + .wg-ws-row{margin-top:0}
.wg-ws-chev{display:inline-flex;align-items:center;justify-content:center;width:10px;height:14px;flex:none;color:var(--dsw-alias-label-secondary);opacity:0;transition:transform .15s ease,opacity .1s ease}
.wg-ws-row:hover .wg-ws-chev{opacity:.55}
.wg-ws-chev.wg-chev-open{transform:rotate(90deg)}
.wg-ws-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.wg-ws-row.wg-active{background:var(--dsw-alias-interactive-bg-selected,rgba(77,107,254,.12))}
.wg-ws-row.wg-drop{box-shadow:inset 0 0 0 1px var(--dsw-alias-brand-primary,#4d6bfe)}
.wg-session-row{display:flex;align-items:center;gap:6px;min-height:30px;padding:0 6px 0 40px;border-radius:var(--dsw-radius-sm,6px);cursor:default;user-select:none}
.wg-session-row:hover{background:var(--dsw-alias-interactive-bg-hover)}
.wg-session-row.wg-active{background:var(--dsw-alias-interactive-bg-selected,rgba(77,107,254,.12))}
.wg-session-title{font-size:12.5px;line-height:17px;flex:1 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--dsw-alias-label-primary)}
.wg-session-time{font-size:11px;color:var(--dsw-alias-label-tertiary,#9aa0aa);flex:none}
.wg-dot{width:6px;height:6px;border-radius:50%;flex:none;background:transparent}
.wg-dot-idle{background:var(--dsw-alias-label-tertiary,#c6cad2);opacity:.5}
.wg-dot-running{background:var(--dsw-alias-brand-primary,#4d6bfe);animation:wg-pulse 1.2s ease-in-out infinite}
.wg-dot-unread{background:var(--dsw-alias-brand-primary,#4d6bfe)}
.wg-dot-waiting{background:var(--dsw-alias-status-warning,#e5a02f)}
@keyframes wg-pulse{0%,100%{opacity:.35}50%{opacity:1}}
.wg-input{font:inherit;font-size:13px;height:24px;flex:1 1 auto;min-width:0;padding:0 6px;border-radius:4px;border:1px solid var(--dsw-alias-brand-primary,#4d6bfe);background:var(--dsw-alias-bg-elevated,#fff);color:inherit;outline:none}
.wg-empty{padding:14px 12px;font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary,#9aa0aa)}
.wg-more{padding:0 6px 0 40px;font-size:11.5px;line-height:22px;color:var(--dsw-alias-label-secondary);cursor:pointer;background:transparent;border:0;text-align:left;width:100%}
.wg-more:hover{color:var(--dsw-alias-label-primary)}
.wg-menu{position:fixed;z-index:2147483000;min-width:168px;padding:4px;border-radius:8px;background:var(--dsw-alias-bg-elevated,#fff);border:1px solid var(--dsw-alias-border-subtle,rgba(0,0,0,.08));box-shadow:0 8px 24px rgba(0,0,0,.14);display:flex;flex-direction:column;gap:1px}
.wg-menu-item{display:flex;align-items:center;gap:8px;height:28px;padding:0 8px;border:0;border-radius:6px;background:transparent;color:inherit;font-size:12.5px;text-align:left;cursor:pointer;white-space:nowrap;width:100%}
.wg-menu-item:hover{background:var(--dsw-alias-interactive-bg-hover)}
.wg-menu-item.wg-danger{color:var(--dsw-alias-status-danger,#d9534f)}
.wg-menu-sep{height:1px;margin:3px 4px;background:var(--dsw-alias-border-subtle,rgba(0,0,0,.08))}
.wg-menu-label{padding:4px 8px 2px;font-size:11px;color:var(--dsw-alias-label-tertiary,#9aa0aa)}
.wg-overlay{position:fixed;inset:0;z-index:2147482999;background:rgba(0,0,0,.28);display:flex;align-items:center;justify-content:center}
.wg-dialog{width:320px;max-width:calc(100vw - 32px);padding:16px;border-radius:12px;background:var(--dsw-alias-bg-elevated,#fff);box-shadow:0 12px 40px rgba(0,0,0,.2);color:var(--dsw-alias-label-primary);font-size:13px}
.wg-dialog-title{font-size:14px;font-weight:600;margin-bottom:8px}
.wg-dialog-body{font-size:12.5px;line-height:18px;color:var(--dsw-alias-label-secondary);word-break:break-all;margin-bottom:14px}
.wg-dialog-input{width:100%;height:28px;margin-bottom:14px;padding:0 8px;border-radius:6px;border:1px solid var(--dsw-alias-border-subtle,rgba(0,0,0,.16));background:transparent;color:inherit;font:inherit;font-size:13px;outline:none}
.wg-dialog-footer{display:flex;justify-content:flex-end;gap:8px}
.wg-btn{height:28px;padding:0 12px;border-radius:6px;font-size:12.5px;cursor:pointer;border:1px solid transparent;background:transparent;color:inherit}
.wg-btn-outline{border-color:var(--dsw-alias-border-subtle,rgba(0,0,0,.16))}
.wg-btn-primary{background:var(--dsw-alias-brand-primary,#4d6bfe);color:#fff}
.wg-toast{position:fixed;left:50%;bottom:24px;transform:translateX(-50%);z-index:2147483001;max-width:min(480px,calc(100vw - 32px));padding:8px 12px;border-radius:8px;background:rgba(24,24,28,.92);color:#fff;font-size:12.5px;line-height:18px;box-shadow:0 8px 24px rgba(0,0,0,.24)}
.wg-rail{display:flex;flex-direction:column;align-items:center;gap:4px;padding:6px 0}
.wg-rail-group{display:flex;align-items:center;justify-content:center;width:32px;height:32px;border:0;border-radius:8px;background:transparent;color:var(--dsw-alias-label-secondary);cursor:pointer}
.wg-rail-group:hover{background:var(--dsw-alias-interactive-bg-hover)}
`;

		function ensureStyles() {
			if (typeof document === "undefined") return;
			const existing = document.querySelector('style[data-dsh-plugin="dsh-workspace-groups"]');
			if (existing !== null) return;
			const tag = document.createElement("style");
			tag.dataset.dshPlugin = "dsh-workspace-groups";
			tag.textContent = CSS;
			document.head.appendChild(tag);
		}
		//#endregion

		//#region store
		function newGroupId() {
			return "g" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
		}

		function createGroupHandle() {
			return storeLib.defineStore({
				init: () => ({
					groups: [],
					ungroupedCollapsed: false,
					expanded: {},
					sessionSort: "updated",
					// Native view options (mirrors dsh-client-ui-workspace's view store).
					groupBy: "workspace",
					orderBy: "updated",
					archivedFilter: "default"
				}),
				persist: PERSIST_KEY,
				actions: {
					createGroup: (draft, name) => {
						const label = String(name ?? "").trim() || "新分区";
						draft.groups.push({ id: newGroupId(), name: label, collapsed: false, workspaceIds: [] });
					},
					renameGroup: (draft, id, name) => {
						const group = draft.groups.find((entry) => entry.id === id);
						const label = String(name ?? "").trim();
						if (group !== undefined && label !== "") group.name = label;
					},
					deleteGroup: (draft, id) => {
						draft.groups = draft.groups.filter((entry) => entry.id !== id);
					},
					setGroupCollapsed: (draft, id, collapsed) => {
						const group = draft.groups.find((entry) => entry.id === id);
						if (group !== undefined) group.collapsed = collapsed;
					},
					moveGroup: (draft, id, delta) => {
						const index = draft.groups.findIndex((entry) => entry.id === id);
						const next = index + delta;
						if (index === -1 || next < 0 || next >= draft.groups.length) return;
						const [moved] = draft.groups.splice(index, 1);
						draft.groups.splice(next, 0, moved);
					},
					setUngroupedCollapsed: (draft, collapsed) => {
						draft.ungroupedCollapsed = collapsed;
					},
					assignWorkspace: (draft, groupId, workspaceId) => {
						if (typeof workspaceId !== "string" || workspaceId === "") return;
						for (const group of draft.groups) {
							group.workspaceIds = group.workspaceIds.filter((id) => id !== workspaceId);
						}
						if (groupId === UNGROUPED) return;
						const target = draft.groups.find((entry) => entry.id === groupId);
						if (target !== undefined && !target.workspaceIds.includes(workspaceId)) target.workspaceIds.push(workspaceId);
					},
					unassignWorkspace: (draft, workspaceId) => {
						for (const group of draft.groups) {
							group.workspaceIds = group.workspaceIds.filter((id) => id !== workspaceId);
						}
					},
					pruneWorkspaces: (draft, validIds) => {
						const valid = new Set(validIds);
						for (const group of draft.groups) {
							group.workspaceIds = group.workspaceIds.filter((id) => valid.has(id));
						}
					},
					toggleWorkspaceExpanded: (draft, workspaceId) => {
						draft.expanded[workspaceId] = draft.expanded[workspaceId] !== true;
					},
					setWorkspaceExpanded: (draft, workspaceId, expanded) => {
						draft.expanded[workspaceId] = expanded === true;
					},
					setSessionSort: (draft, mode) => {
						if (mode === "updated" || mode === "name") draft.sessionSort = mode;
					},
					setGroupBy: (draft, mode) => {
						if (mode === "workspace" || mode === "workspaceTree" || mode === "flat") draft.groupBy = mode;
					},
					setOrderBy: (draft, mode) => {
						if (mode === "manual" || mode === "updated") draft.orderBy = mode;
					},
					setArchivedFilter: (draft, mode) => {
						if (mode === "default" || mode === "show" || mode === "only") draft.archivedFilter = mode;
					},
					setAllGroupsCollapsed: (draft, collapsed) => {
						for (const group of draft.groups) group.collapsed = collapsed === true;
						draft.ungroupedCollapsed = collapsed === true;
					},
					promoteUngrouped: (draft, name, workspaceIds) => {
						const label = String(name ?? "").trim();
						if (label === "" || !Array.isArray(workspaceIds) || workspaceIds.length === 0) return;
						draft.groups.push({
							id: newGroupId(),
							name: label,
							collapsed: false,
							workspaceIds: [...new Set(workspaceIds)]
						});
					}
				}
			});
		}
		//#endregion

		//#region helpers
		function relativeTime(iso) {
			if (typeof iso !== "string" || iso === "") return "";
			const stamp = Date.parse(iso);
			if (Number.isNaN(stamp)) return "";
			const diff = Date.now() - stamp;
			const minute = 60000;
			const hour = 60 * minute;
			const day = 24 * hour;
			if (diff < minute) return "刚刚";
			if (diff < hour) return `${Math.floor(diff / minute)} 分钟前`;
			if (diff < day) return `${Math.floor(diff / hour)} 小时前`;
			if (diff < day * 30) return `${Math.floor(diff / day)} 天前`;
			const date = new Date(stamp);
			return `${date.getMonth() + 1}/${date.getDate()}`;
		}

		function sessionState(status) {
			if (status === undefined || status === null) return "idle";
			if (status.pendingInteraction !== undefined) return "waiting";
			if (status.running === true) return "running";
			if (status.completionUnread === true) return "unread";
			return "idle";
		}

		function stop(event) {
			event.stopPropagation();
		}
		//#endregion

		//#region browser component
		const SESSION_PAGE = 5;

		/**
		 * Keeps a render fault inside this seat: the slot renderer would otherwise
		 * abdicate the whole entry and leave the sidebar's browsing region empty.
		 */
		class Boundary extends react.Component {
			constructor(props) {
				super(props);
				this.state = { error: null };
			}
			static getDerivedStateFromError(error) {
				return { error };
			}
			componentDidCatch(error, info) {
				console.error(LOG_PREFIX, "browser render failed", error, info);
			}
			render() {
				if (this.state.error !== null) {
					const message = this.state.error instanceof Error ? this.state.error.message : String(this.state.error);
					return h("div", { className: "wg-empty" }, `工作区分区插件渲染出错：${message}`);
				}
				return this.props.children ?? null;
			}
		}

		// Native "视图选项" menu, ported 1:1 from dsh-client-ui-workspace's ViewOptionsMenu
		// (same items, labels, icons, selection + Menu/Tooltip primitives) so the button
		// behaves exactly like the built-in browser. Grouping/order/archive are applied to
		// this plugin's partitioned list in BrowserBody.
		function NativeViewMenu({ groupBy, orderBy, archivedFilter, onGroup, onOrder, onArchived }) {
			const [open, setOpen] = react.useState(false);
			const item = (id, label, iconName) => ({ id, label, icon: icon(iconName, 16) });
			const items = [
				{ type: "label", id: "group-by", text: "分组方式" },
				item("workspace", "按工作区", "IconFolderCloseRegular"),
				item("workspaceTree", "按工作区树", "IconWorkspaceTreeOutlineRegular"),
				item("flat", "单列表", "IconFlatListOutlineRegular"),
				{ type: "separator", id: "order-by-separator" },
				{ type: "label", id: "order-by", text: "排序方式" },
				item("manual", "手动排序", "IconChevronsUpDownOutlineRegular"),
				item("updated", "最近更新", "IconClockOutlineRegular"),
				{ type: "separator", id: "archived-filter-separator" },
				{ type: "label", id: "filter-by", text: "筛选会话" },
				item("hide-archived", "隐藏已归档", "IconArchiveOffOutlineRegular"),
				item("show-archived", "全部对话（显示已归档）", "IconQueueOutlineRegular"),
				item("only-archived", "仅显示已归档", "IconArchiveCheckOutlineRegular")
			];
			const archivedId = { default: "hide-archived", show: "show-archived", only: "only-archived" }[archivedFilter] ?? "hide-archived";
			const anchor = h(
				primitives.Tooltip,
				{
					label: "视图选项",
					side: "bottom",
					delayMs: 500,
					portal: true,
					children: h(
						"button",
						{
							type: "button",
							className: "wg-iconbtn",
							"aria-label": "视图选项",
							onClick: () => setOpen((value) => !value)
						},
						icon("IconSlidersTwoOutlineRegular", 16)
					)
				}
			);
			if (typeof primitives.Menu !== "function") {
				return anchor;
			}
			return h(primitives.Menu, {
				open,
				onClose: () => setOpen(false),
				items,
				selectedIds: [groupBy, orderBy, archivedId],
				onSelect: (id) => {
					if (id === "workspace" || id === "workspaceTree" || id === "flat") onGroup(id);
					else if (id === "manual" || id === "updated") onOrder(id);
					else if (id === "hide-archived") onArchived("default");
					else if (id === "show-archived") onArchived("show");
					else if (id === "only-archived") onArchived("only");
					setOpen(false);
				},
				align: "end",
				dense: true,
				portal: true,
				anchor
			});
		}

		function GroupedWorkspaceBrowser(props) {
			const ready =
				typeof props.useStore === "function" &&
				typeof props.useWorkspaces === "function" &&
				typeof props.useSessions === "function" &&
				typeof props.useSessionStatus === "function";
			if (!ready) return h("div", { className: "wg-empty" }, "工作区分区插件缺少依赖服务（workspaces / sessions / store）。");
			return h(Boundary, null, h(BrowserBody, props));
		}

		function BrowserBody(props) {
			const useStore = props.useStore;
			const actions = props.actions;
			const wide = props.wide !== false;
			const useWorkspaces = props.useWorkspaces;
			const useSessions = props.useSessions;
			const useSessionStatus = props.useSessionStatus;

			const workspaceSnapshot = useWorkspaces((state) => state);
			const sessionList = useSessions((state) => state);
			const statuses = useSessionStatus((state) => state);
			const view = useStore((state) => state);

			const workspaces = workspaceSnapshot.items ?? EMPTY_LIST;
			const byId = sessionList.byId ?? {};
			const ids = sessionList.ids ?? EMPTY_LIST;
			const archived = react.useMemo(
				() => new Set(workspaceSnapshot.archivedSessionIds ?? EMPTY_LIST),
				[workspaceSnapshot.archivedSessionIds]
			);

			const [editingGroup, setEditingGroup] = react.useState(null);
			const [creating, setCreating] = react.useState(null);
			const [menu, setMenu] = react.useState(null);
			const [dialog, setDialog] = react.useState(null);
			const [toast, setToast] = react.useState("");
			const [dropTarget, setDropTarget] = react.useState(null);
			const [limit, setLimit] = react.useState({});
			const [searchOpen, setSearchOpen] = react.useState(false);
			const [search, setSearch] = react.useState("");
			const [remoteSearch, setRemoteSearch] = react.useState({ query: "", status: "idle", items: [], hasMore: false });
			const [wsFlow, setWsFlow] = react.useState({ open: false, busy: false });

			// View options (native semantics), tolerant of older persisted stores.
			const groupBy = view.groupBy === "flat" || view.groupBy === "workspaceTree" ? view.groupBy : "workspace";
			const orderBy = view.orderBy === "manual" ? "manual" : "updated";
			const archivedFilter = view.archivedFilter === "show" || view.archivedFilter === "only" ? view.archivedFilter : "default";

			// Keep the native session-search callback off the effect dependency list.
			const searchSessionsRef = react.useRef(null);
			searchSessionsRef.current = typeof props.searchSessions === "function" ? props.searchSessions : null;

			// Live availability of the native directory-flow slot (browse/native picker).
			const directoryFlowSource = props.directoryFlowSource;
			const hasDirectoryFlow = react.useSyncExternalStore(
				directoryFlowSource && typeof directoryFlowSource.subscribe === "function" ? directoryFlowSource.subscribe : () => () => {},
				directoryFlowSource && typeof directoryFlowSource.getSnapshot === "function" ? directoryFlowSource.getSnapshot : () => false
			);

			const notify = react.useCallback((message) => {
				setToast(message);
			}, []);

			react.useEffect(() => {
				if (toast === "") return undefined;
				const timer = setTimeout(() => setToast(""), 3200);
				return () => clearTimeout(timer);
			}, [toast]);

			// Native session-history search: debounced `sessions.search` over the same
			// RPC the built-in browser uses; local title/workspace matches merge in below.
			react.useEffect(() => {
				const q = search.trim();
				if (q === "") {
					setRemoteSearch({ query: "", status: "idle", items: [], hasMore: false });
					return undefined;
				}
				const searchSessions = searchSessionsRef.current;
				if (searchSessions === null) {
					setRemoteSearch({ query: q, status: "ready", items: [], hasMore: false });
					return undefined;
				}
				const controller = new AbortController();
				setRemoteSearch({ query: q, status: "loading", items: [], hasMore: false });
				const timer = setTimeout(() => {
					searchSessions(q, controller.signal).then(
						(result) => {
							if (controller.signal.aborted) return;
							setRemoteSearch({ query: q, status: "ready", items: (result && result.items) || [], hasMore: result && result.hasMore === true });
						},
						() => {
							if (controller.signal.aborted) return;
							setRemoteSearch({ query: q, status: "ready", items: [], hasMore: false });
						}
					);
				}, 250);
				return () => {
					clearTimeout(timer);
					controller.abort();
				};
			}, [search]);

			react.useEffect(() => {
				if (menu === null) return undefined;
				const close = () => setMenu(null);
				const onKey = (event) => {
					if (event.key === "Escape") close();
				};
				document.addEventListener("mousedown", close);
				document.addEventListener("keydown", onKey);
				return () => {
					document.removeEventListener("mousedown", close);
					document.removeEventListener("keydown", onKey);
				};
			}, [menu]);

			// Drop stale Workspace ids once the Host projection is authoritative.
			react.useEffect(() => {
				if (workspaceSnapshot.phase !== "ready") return;
				const valid = workspaces.map((workspace) => workspace.workspaceId);
				const validSet = new Set(valid);
				const stale = (view.groups ?? []).some((group) => group.workspaceIds.some((id) => !validSet.has(id)));
				if (stale) actions.pruneWorkspaces(valid);
			}, [workspaceSnapshot.phase, workspaces, view.groups, actions]);

			const currentSessionId = react.useMemo(() => {
				for (const id of ids) {
					const session = byId[id];
					if (session !== undefined && (session.retainedBy?.mainView ?? 0) > 0) return id;
				}
				return undefined;
			}, [ids, byId]);

			const sessionsOf = react.useCallback(
				(workspace) => {
					const rows = [];
					for (const id of workspace.sessionIds) {
						const session = byId[id];
						if (session === undefined) continue;
						if (session.origin === "subagent") continue;
						if (session.blank === true && session.id !== currentSessionId) continue;
						const isArchived = archived.has(session.id);
						if (archivedFilter === "default" && isArchived) continue;
						if (archivedFilter === "only" && !isArchived) continue;
						rows.push(session);
					}
					if (orderBy === "manual") {
						// No persisted manual session order in this plugin: fall back to name,
						// which is stable and mirrors the old "名称" sort until dragged.
						rows.sort((left, right) => String(left.title ?? "").localeCompare(String(right.title ?? ""), "zh"));
					} else {
						rows.sort((left, right) => {
							const a = Date.parse(left.updatedAt ?? "") || 0;
							const b = Date.parse(right.updatedAt ?? "") || 0;
							return b - a;
						});
					}
					return rows;
				},
				[byId, archived, currentSessionId, archivedFilter, orderBy]
			);

			const workspaceById = react.useMemo(() => {
				const map = new Map();
				for (const workspace of workspaces) map.set(workspace.workspaceId, workspace);
				return map;
			}, [workspaces]);

			// Port of the native deriveSearchResults: local title/workspace/id matches
			// first, then remote session-history hits, deduped and recency-ordered.
			const searchRows = react.useMemo(() => {
				const q = search.trim().toLowerCase();
				const limit = typeof props.searchResultLimit === "number" ? props.searchResultLimit : 20;
				if (q === "") return { items: [], hasMore: false, pending: false };
				const workspaceTitleBySession = new Map();
				for (const workspace of workspaces) {
					for (const sid of workspace.sessionIds) if (!workspaceTitleBySession.has(sid)) workspaceTitleBySession.set(sid, workspace.title);
				}
				const labelOf = (session) => workspaceTitleBySession.get(session.id) ?? session.cwd ?? "未分组";
				const passesArchive = (session) => {
					const isArchived = archived.has(session.id);
					if (archivedFilter === "default" && isArchived) return false;
					if (archivedFilter === "only" && !isArchived) return false;
					return true;
				};
				const current = remoteSearch.query === search.trim() ? remoteSearch : { query: search.trim(), status: "loading", items: [], hasMore: false };
				const contentBySession = new Map();
				for (const entry of current.items ?? []) if (!contentBySession.has(entry.sessionId)) contentBySession.set(entry.sessionId, entry);
				const local = [];
				for (const id of ids) {
					const session = byId[id];
					if (session === undefined || session.blank === true || !passesArchive(session)) continue;
					const title = String(session.title ?? "");
					if (title.toLowerCase().includes(q) || String(labelOf(session)).toLowerCase().includes(q) || String(session.id).toLowerCase().includes(q)) local.push(session);
				}
				local.sort((left, right) => (Date.parse(right.updatedAt ?? "") || 0) - (Date.parse(left.updatedAt ?? "") || 0));
				const seen = new Set();
				const ordered = [];
				for (const session of local) {
					if (seen.has(session.id)) continue;
					seen.add(session.id);
					ordered.push(session);
				}
				for (const entry of current.items ?? []) {
					const session = byId[entry.sessionId];
					if (session === undefined || session.blank === true || seen.has(session.id) || !passesArchive(session)) continue;
					seen.add(session.id);
					ordered.push(session);
				}
				return {
					items: ordered.slice(0, limit).map((session) => ({
						session,
						title: session.title !== undefined && String(session.title).trim() !== "" ? session.title : "未命名会话",
						workspace: labelOf(session),
						archived: archived.has(session.id),
						snippet: contentBySession.get(session.id)?.snippet
					})),
					hasMore: (current.hasMore === true) || ordered.length > limit,
					pending: current.status === "loading"
				};
			}, [search, ids, byId, workspaces, archived, archivedFilter, remoteSearch, props.searchResultLimit]);

			const groups = view.groups ?? EMPTY_LIST;
			const assigned = new Set();
			const sections = groups.map((group) => {
				const members = [];
				for (const id of group.workspaceIds) {
					const workspace = workspaceById.get(id);
					if (workspace === undefined) continue;
					assigned.add(id);
					members.push(workspace);
				}
				return { kind: "group", id: group.id, name: group.name, collapsed: group.collapsed === true, members };
			});
			const loose = workspaces.filter((workspace) => !assigned.has(workspace.workspaceId));

			const query = search.trim().toLowerCase();
			const searchActive = query !== "";
			const matchesQuery = (value) => String(value ?? "").toLowerCase().includes(query);
			const visibleSessionsOf = (workspace) => {
				const all = sessionsOf(workspace);
				if (!searchActive) return all;
				if (matchesQuery(workspace.title) || matchesQuery(workspace.path)) return all;
				return all.filter((session) => matchesQuery(session.title));
			};
			const workspaceVisible = (workspace) =>
				!searchActive || matchesQuery(workspace.title) || matchesQuery(workspace.path) || visibleSessionsOf(workspace).length > 0;
			const shownSections = sections
				.map((section) => {
					if (!searchActive) return section;
					const nameHit = matchesQuery(section.name);
					const members = nameHit ? section.members : section.members.filter(workspaceVisible);
					return { ...section, members, collapsed: false, nameHit };
				})
				.filter((section) => !searchActive || section.nameHit === true || section.members.length > 0);
			const looseShown = searchActive ? loose.filter(workspaceVisible) : loose;

			// ---- interactions ----
			const toggleGroup = (section) => {
				if (section.kind === "ungrouped") {
					actions.setUngroupedCollapsed(!section.collapsed);
					return;
				}
				actions.setGroupCollapsed(section.id, !section.collapsed);
			};

			const openSessionRow = (sessionId) => {
				if (props.openSession === undefined) return;
				props.openSession(sessionId);
				if (!wide && typeof props.expandSidebar === "function") props.expandSidebar();
			};

			const startInWorkspace = (workspaceId) => {
				if (props.startSession === undefined) return;
				props.startSession(workspaceId, { clearPreviousDraft: false });
				if (!wide && typeof props.expandSidebar === "function") props.expandSidebar();
			};

			const adoptPath = (path) => {
				if (props.createWorkspace === undefined) return;
				props.createWorkspace(path).then(
					(workspace) => {
						if (workspace !== undefined && workspace.workspaceId !== undefined) {
							startInWorkspace(workspace.workspaceId);
						}
					},
					(reason) => notify(`添加工作区失败：${reason instanceof Error ? reason.message : String(reason)}`)
				);
			};

			const addWorkspace = () => {
				if (props.pickDirectory === undefined) {
					setDialog({
						kind: "path",
						title: "添加工作区",
						value: "",
						onSubmit: (value) => {
							setDialog(null);
							if (value.trim() !== "") adoptPath(value.trim());
						}
					});
					return;
				}
				props.pickDirectory().then(
					(path) => {
						if (typeof path === "string" && path !== "") adoptPath(path);
					},
					() => {
						setDialog({
							kind: "path",
							title: "添加工作区（请输入目录绝对路径）",
							value: "",
							onSubmit: (value) => {
								setDialog(null);
								if (value.trim() !== "") adoptPath(value.trim());
							}
						});
					}
				);
			};

			// Native "添加工作区": same native directory picker the built-in browser drives.
			// Prefer the host directory picker (identical backend the native picker uses);
			// if it is unavailable, fall back to the directory-flow slot; otherwise the
			// native "目录选择器不可用" notification — never the old text-path dialog.
			const openAddWorkspace = () => {
				if (typeof props.pickDirectory === "function") {
					Promise.resolve()
						.then(() => props.pickDirectory())
						.then(
							(path) => {
								if (typeof path === "string" && path !== "") adoptPath(path);
							},
							() => {
								if (typeof props.renderSlot === "function" && hasDirectoryFlow) setWsFlow({ open: true, busy: false });
								else notify("目录选择器不可用");
							}
						);
					return;
				}
				if (typeof props.renderSlot === "function" && hasDirectoryFlow) {
					setWsFlow({ open: true, busy: false });
					return;
				}
				notify("目录选择器不可用");
			};

			const wsFlowOwner = {
				open: wsFlow.open,
				busy: wsFlow.busy,
				onPicked: (path) => {
					if (typeof path !== "string" || path === "") {
						setWsFlow({ open: false, busy: false });
						return;
					}
					if (typeof props.createWorkspace !== "function") {
						setWsFlow({ open: false, busy: false });
						return;
					}
					setWsFlow({ open: true, busy: true });
					props.createWorkspace(path).then(
						(workspace) => {
							setWsFlow({ open: false, busy: false });
							if (workspace !== undefined && workspace.workspaceId !== undefined) startInWorkspace(workspace.workspaceId);
						},
						(reason) => {
							setWsFlow({ open: false, busy: false });
							const message = reason instanceof Error ? reason.message : String(reason);
							setDialog({ kind: "confirm", title: "无法打开文件夹", body: message, onConfirm: () => { setDialog(null); setWsFlow({ open: true, busy: false }); } });
						}
					);
				},
				onCancel: () => setWsFlow({ open: false, busy: false }),
				onError: (message) => {
					setWsFlow({ open: false, busy: false });
					setDialog({ kind: "confirm", title: "无法打开文件夹", body: String(message), onConfirm: () => { setDialog(null); setWsFlow({ open: true, busy: false }); } });
				}
			};

			const commitGroupRename = (id, value) => {
				if (id === UNGROUPED) {
					actions.promoteUngrouped(value, loose.map((workspace) => workspace.workspaceId));
				} else {
					actions.renameGroup(id, value);
				}
				setEditingGroup(null);
			};

			const commitCreate = (value) => {
				actions.createGroup(value);
				setCreating(null);
			};

			const openMenu = (event, kind, id) => {
				event.preventDefault();
				event.stopPropagation();
				const rect = event.currentTarget.getBoundingClientRect();
				setMenu({ kind, id, x: rect.left + rect.width - 8, y: rect.bottom + 2 });
			};

			const dropWorkspace = (event, targetId) => {
				event.preventDefault();
				event.stopPropagation();
				setDropTarget(null);
				const workspaceId = event.dataTransfer.getData("text/plain");
				if (workspaceId === "") return;
				actions.assignWorkspace(targetId, workspaceId);
			};

			const allowDrop = (event, targetId) => {
				event.preventDefault();
				event.dataTransfer.dropEffect = "move";
				if (dropTarget !== targetId) setDropTarget(targetId);
			};

			// ---- render pieces ----
			const renderSessionRow = (workspace, session) => {
				const status = statuses instanceof Map ? statuses.get(session.id) : statuses[session.id];
				const state = sessionState(status);
				const title = session.title !== undefined && session.title.trim() !== "" ? session.title : "未命名会话";
				return h(
					"div",
					{
						key: `session-${session.id}`,
						className: "wg-session-row" + (session.id === currentSessionId ? " wg-active" : ""),
						role: "treeitem",
						title,
						onClick: () => openSessionRow(session.id)
					},
					h("span", { className: `wg-dot wg-dot-${state}` }),
					h("span", { className: "wg-session-title" }, title),
					h(
						"span",
						{ className: "wg-actions" },
						h(
							"button",
							{
								type: "button",
								className: "wg-iconbtn",
								title: "更多",
								onClick: (event) => openMenu(event, "session", session.id)
							},
							IconMore(14)
						)
					),
					h("span", { className: "wg-session-time" }, relativeTime(session.updatedAt))
				);
			};

			const renderSearchRow = (item) => {
				const meta = item.archived ? `已归档 · ${item.workspace}` : item.snippet !== undefined ? `${item.workspace} · ${item.snippet}` : item.workspace;
				return h(
					"div",
					{
						key: `sr-${item.session.id}`,
						className: "wg-session-row" + (item.session.id === currentSessionId ? " wg-active" : "") + (item.archived ? " wg-archived" : ""),
						role: "treeitem",
						title: item.title,
						onClick: () => openSessionRow(item.session.id)
					},
					h("span", { className: "wg-dot wg-dot-idle" }),
					h(
						"span",
						{ style: { display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 auto" } },
						h("span", { className: "wg-session-title" }, item.title),
						h("span", { style: { fontSize: "11px", lineHeight: "14px", color: "var(--dsw-alias-label-tertiary,#9aa0aa)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, meta)
					),
					h("span", { className: "wg-session-time" }, relativeTime(item.session.updatedAt))
				);
			};

			const renderFlatRow = (session) => {
				const title = session.title !== undefined && String(session.title).trim() !== "" ? session.title : "未命名会话";
				let workspaceTitle = "";
				for (const workspace of workspaces) {
					if (workspace.sessionIds.includes(session.id)) {
						workspaceTitle = workspace.title || workspace.path;
						break;
					}
				}
				const isArchived = archived.has(session.id);
				return h(
					"div",
					{
						key: `flat-${session.id}`,
						className: "wg-session-row wg-flat-row" + (session.id === currentSessionId ? " wg-active" : ""),
						role: "treeitem",
						title,
						onClick: () => openSessionRow(session.id)
					},
					h("span", { className: "wg-dot wg-dot-idle" }),
					h(
						"span",
						{ style: { display: "flex", flexDirection: "column", minWidth: 0, flex: "1 1 auto" } },
						h("span", { className: "wg-session-title" }, title),
						h("span", { style: { fontSize: "11px", lineHeight: "14px", color: "var(--dsw-alias-label-tertiary,#9aa0aa)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, (isArchived ? "已归档 · " : "") + (workspaceTitle || "未分组"))
					),
					h("span", { className: "wg-session-time" }, relativeTime(session.updatedAt))
				);
			};

			const renderWorkspaceRow = (workspace) => {
				const sessions = visibleSessionsOf(workspace);
				const expanded = searchActive ? true : view.expanded?.[workspace.workspaceId] === true;
				const shown = searchActive ? sessions.length : limit[workspace.workspaceId] ?? SESSION_PAGE;
				const visible = sessions.slice(0, shown);
				const hidden = searchActive ? 0 : sessions.length - visible.length;
				const title = workspace.title !== undefined && workspace.title.trim() !== "" ? workspace.title : workspace.path;
				const rows = [
					h(
						"div",
						{
							key: `ws-${workspace.workspaceId}`,
							className:
								"wg-ws-row" +
								(dropTarget === workspace.workspaceId ? " wg-drop" : ""),
							role: "treeitem",
							"aria-expanded": expanded,
							title: workspace.path,
							draggable: true,
							onClick: () => actions.toggleWorkspaceExpanded(workspace.workspaceId),
							onContextMenu: (event) => openMenu(event, "workspace", workspace.workspaceId),
							onDragStart: (event) => {
								event.dataTransfer.effectAllowed = "move";
								event.dataTransfer.setData("text/plain", workspace.workspaceId);
							},
							onDragOver: (event) => {
								if (dropTarget === workspace.workspaceId) {
									event.preventDefault();
									event.dataTransfer.dropEffect = "move";
								}
							}
						},
						h("span", { className: "wg-ws-chev" + (expanded ? " wg-chev-open" : "") }, icon("IconTriangleRightFillRegular", 9)),
						h("span", { className: "wg-folder" }, expanded ? IconFolderOpen(15) : IconFolderClose(15)),
						h("span", { className: "wg-title" }, title),
						sessions.length > 0 ? h("span", { className: "wg-count" }, String(sessions.length)) : null,
						h(
							"span",
							{ className: "wg-actions" },
							h(
								"button",
								{
									type: "button",
									className: "wg-iconbtn",
									title: "在此工作区新建会话",
									onClick: (event) => {
										stop(event);
										startInWorkspace(workspace.workspaceId);
									}
								},
								IconAdd(14)
							),
							h(
								"button",
								{
									type: "button",
									className: "wg-iconbtn",
									title: "更多",
									onClick: (event) => openMenu(event, "workspace", workspace.workspaceId)
								},
								IconMore(14)
							)
						)
					)
				];
				if (expanded) {
					for (const session of visible) rows.push(renderSessionRow(workspace, session));
					if (hidden > 0) {
						rows.push(
							h(
								"button",
								{
									key: `more-${workspace.workspaceId}`,
									type: "button",
									className: "wg-more",
									onClick: (event) => {
										stop(event);
										setLimit((current) => ({ ...current, [workspace.workspaceId]: shown + SESSION_PAGE * 2 }));
									}
								},
								`显示更多（还有 ${hidden} 条）`
							)
						);
					}
				}
				return rows;
			};

			const renderGroupHeader = (section) => {
				const editing = editingGroup !== null && editingGroup.id === section.id;
				return h(
					"div",
					{
						key: `group-${section.id}`,
						className: "wg-group-row" + (dropTarget === section.id ? " wg-drop" : ""),
						role: "treeitem",
						"aria-expanded": !section.collapsed,
						onClick: () => toggleGroup(section),
						onDragOver: (event) => allowDrop(event, section.id),
						onDragLeave: () => setDropTarget((current) => (current === section.id ? null : current)),
						onDrop: (event) => dropWorkspace(event, section.id)
					},
					IconChevron(!section.collapsed),
					editing
						? h("input", {
								className: "wg-input",
								autoFocus: true,
								defaultValue: editingGroup.value,
								onClick: stop,
								onBlur: (event) => commitGroupRename(section.id, event.currentTarget.value),
								onKeyDown: (event) => {
									if (event.key === "Enter") commitGroupRename(section.id, event.currentTarget.value);
									if (event.key === "Escape") setEditingGroup(null);
								}
							})
						: h("span", { className: "wg-title" }, section.name),
					h(
						"span",
						{ className: "wg-actions" },
						h(
							"button",
							{
								type: "button",
								className: "wg-iconbtn",
								title: section.kind === "ungrouped" ? "重命名并转为分区" : "重命名分区",
								onClick: (event) => {
									stop(event);
									setEditingGroup({ id: section.id, value: section.name });
								}
							},
							IconEdit(14)
						),
						section.kind === "ungrouped"
							? null
							: h(
									"button",
									{
										type: "button",
										className: "wg-iconbtn",
										title: "删除分区（工作区保留）",
										onClick: (event) => {
											stop(event);
											actions.deleteGroup(section.id);
										}
									},
									IconTrash(14)
								),
						h(
							"button",
							{
								type: "button",
								className: "wg-iconbtn",
								title: "更多",
								onClick: (event) => openMenu(event, "group", section.id)
							},
							IconMore(14)
						)
					)
				);
			};

			const renderSection = (section) => {
				const children = [];
				if (!section.collapsed) {
					for (const workspace of section.members) {
						for (const row of renderWorkspaceRow(workspace)) children.push(row);
					}
					if (section.kind === "group" && section.members.length === 0) {
						children.push(h("div", { key: `empty-${section.id}`, className: "wg-empty" }, "把工作区拖到分区标题上即可加入"));
					}
				}
				return h("div", { key: `${section.kind}-${section.id}`, className: "wg-group" }, renderGroupHeader(section), children);
			};

			const sectionList = shownSections.slice();
			const showUngrouped = looseShown.length > 0 || (!searchActive && sections.length === 0);
			if (showUngrouped) {
				sectionList.push({
					kind: "ungrouped",
					id: UNGROUPED,
					name: "未分组",
					collapsed: searchActive ? false : view.ungroupedCollapsed === true,
					members: looseShown
				});
			}

			const flatRows = groupBy === "flat"
				? (() => {
						const rows = [];
						for (const workspace of workspaces) {
							for (const session of sessionsOf(workspace)) rows.push(session);
						}
						rows.sort((left, right) => (Date.parse(right.updatedAt ?? "") || 0) - (Date.parse(left.updatedAt ?? "") || 0));
						return rows;
					})()
				: [];

			const menuContent = () => {
				if (menu === null) return null;
				const items = [];
				if (menu.kind === "group") {
					const section = sectionList.find((entry) => entry.id === menu.id);
					if (section === undefined) return null;
					const isUngrouped = section.kind === "ungrouped";
					items.push(
						h("button", { key: "rename", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); setEditingGroup({ id: section.id, value: section.name }); } }, IconEdit(14), isUngrouped ? "重命名并转为分区" : "重命名分区"),
						h("button", { key: "new", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); setCreating({ value: "" }); } }, IconAdd(14), "新建分区")
					);
					if (!isUngrouped) {
						items.push(
							h("button", { key: "up", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.moveGroup(section.id, -1); } }, "上移分区"),
							h("button", { key: "down", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.moveGroup(section.id, 1); } }, "下移分区"),
							h("div", { key: "sep", className: "wg-menu-sep" }),
							h("button", { key: "del", type: "button", className: "wg-menu-item wg-danger", onClick: () => { setMenu(null); actions.deleteGroup(section.id); } }, IconTrash(14), "删除分区（工作区保留）")
						);
					}
				} else if (menu.kind === "workspace") {
					const workspace = workspaceById.get(menu.id);
					if (workspace === undefined) return null;
					items.push(
						h("button", { key: "new", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); startInWorkspace(workspace.workspaceId); } }, IconAdd(14), "新建会话"),
						h("button", { key: "rename", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); setDialog({ kind: "workspace-name", title: "重命名工作区", value: workspace.title, target: workspace.workspaceId }); } }, IconEdit(14), "重命名工作区"),
						h("div", { key: "sep1", className: "wg-menu-sep" }),
						h("div", { key: "label", className: "wg-menu-label" }, "移入分区")
					);
					for (const section of sections) {
						items.push(
							h(
								"button",
								{
									key: `move-${section.id}`,
									type: "button",
									className: "wg-menu-item",
									onClick: () => {
										setMenu(null);
										actions.assignWorkspace(section.id, workspace.workspaceId);
									}
								},
								IconFolderClose(14),
								section.name
							)
						);
					}
					items.push(
						h("button", { key: "ungroup", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.unassignWorkspace(workspace.workspaceId); } }, "移出分区"),
						h("div", { key: "sep2", className: "wg-menu-sep" }),
						h(
							"button",
							{
								key: "del",
								type: "button",
								className: "wg-menu-item wg-danger",
								onClick: () => {
									setMenu(null);
									setDialog({
										kind: "confirm",
										title: "删除工作区",
										body: `确定从列表移除「${workspace.title || workspace.path}」吗？磁盘上的文件与已有会话不会被删除。`,
										onConfirm: () => {
											setDialog(null);
											if (props.deleteWorkspace === undefined) return;
											props.deleteWorkspace(workspace.workspaceId).catch((reason) =>
												notify(`删除工作区失败：${reason instanceof Error ? reason.message : String(reason)}`)
											);
										}
									});
								}
							},
							IconTrash(14),
							"删除工作区"
						)
					);
				} else if (menu.kind === "session") {
					const session = byId[menu.id];
					if (session === undefined) return null;
					items.push(
						h("button", { key: "open", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); openSessionRow(session.id); } }, "打开会话"),
						h(
							"button",
							{
								key: "archive",
								type: "button",
								className: "wg-menu-item wg-danger",
								onClick: () => {
									setMenu(null);
									if (props.archiveSession === undefined) return;
									props.archiveSession(session.id).catch((reason) =>
										notify(`归档失败：${reason instanceof Error ? reason.message : String(reason)}`)
									);
								}
							},
							"归档会话"
						)
					);
				} else if (menu.kind === "view") {
					const sort = view.sessionSort === "name" ? "name" : "updated";
					items.push(
						h("button", { key: "expand", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.setAllGroupsCollapsed(false); } }, "展开全部分区"),
						h("button", { key: "collapse", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.setAllGroupsCollapsed(true); } }, "折叠全部分区"),
						h("div", { key: "sep", className: "wg-menu-sep" }),
						h("div", { key: "sort-label", className: "wg-menu-label" }, "会话排序"),
						h("button", { key: "sort-updated", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.setSessionSort("updated"); } }, (sort === "updated" ? "✓ " : "　 ") + "最近更新"),
						h("button", { key: "sort-name", type: "button", className: "wg-menu-item", onClick: () => { setMenu(null); actions.setSessionSort("name"); } }, (sort === "name" ? "✓ " : "　 ") + "名称")
					);
				}
				const style = {
					left: Math.max(8, Math.min(menu.x, (typeof window === "undefined" ? 800 : window.innerWidth) - 200)) + "px",
					top: Math.max(8, Math.min(menu.y, (typeof window === "undefined" ? 600 : window.innerHeight) - 240)) + "px"
				};
				const menuNode = h(
					"div",
					{
						className: "wg-menu",
						style,
						onMouseDown: stop,
						onContextMenu: (event) => event.preventDefault()
					},
					items
				);
				if (reactDom !== null && typeof reactDom.createPortal === "function") {
					return reactDom.createPortal(menuNode, document.body);
				}
				return menuNode;
			};

			const dialogContent = () => {
				if (dialog === null) return null;
				const value = dialog.value ?? "";
				const close = () => setDialog(null);
				const body = [];
				if (dialog.kind === "confirm") {
					body.push(h("div", { key: "body", className: "wg-dialog-body" }, dialog.body));
					body.push(
						h(
							"div",
							{ key: "footer", className: "wg-dialog-footer" },
							h("button", { type: "button", className: "wg-btn wg-btn-outline", onClick: close }, "取消"),
							h(
								"button",
								{
									type: "button",
									className: "wg-btn wg-btn-primary",
									onClick: () => {
										if (typeof dialog.onConfirm === "function") dialog.onConfirm();
										else close();
									}
								},
								"确定"
							)
						)
					);
				} else if (dialog.kind === "path") {
					body.push(
						h("input", {
							key: "input",
							className: "wg-dialog-input",
							autoFocus: true,
							placeholder: "D:\\projects\\my-app",
							defaultValue: "",
							onKeyDown: (event) => {
								if (event.key === "Escape") close();
								if (event.key === "Enter") dialog.onSubmit(event.currentTarget.value);
							},
							ref: (node) => {
								if (node !== null) dialog.inputRef = node;
							}
						})
					);
					body.push(
						h(
							"div",
							{ key: "footer", className: "wg-dialog-footer" },
							h("button", { type: "button", className: "wg-btn wg-btn-outline", onClick: close }, "取消"),
							h(
								"button",
								{
									type: "button",
									className: "wg-btn wg-btn-primary",
									onClick: () => {
										const node = dialog.inputRef;
										dialog.onSubmit(node !== undefined && node !== null ? node.value : "");
									}
								},
								"添加"
							)
						)
					);
				} else {
					// workspace rename
					const renameRef = { current: null };
					body.push(
						h("input", {
							key: "input",
							className: "wg-dialog-input",
							autoFocus: true,
							defaultValue: value,
							onKeyDown: (event) => {
								if (event.key === "Escape") close();
								if (event.key === "Enter") {
									const next = event.currentTarget.value.trim();
									close();
									if (next !== "" && props.renameWorkspace !== undefined) {
										props.renameWorkspace(dialog.target, next).catch((reason) =>
											notify(`重命名失败：${reason instanceof Error ? reason.message : String(reason)}`)
										);
									}
								}
							}
						})
					);
					body.push(
						h(
							"div",
							{ key: "footer", className: "wg-dialog-footer" },
							h("button", { type: "button", className: "wg-btn wg-btn-outline", onClick: close }, "取消"),
							h(
								"button",
								{
									type: "button",
									className: "wg-btn wg-btn-primary",
									onClick: (event) => {
										const input = event.currentTarget.closest(".wg-dialog").querySelector(".wg-dialog-input");
										const next = input !== null ? input.value.trim() : "";
										close();
										if (next !== "" && props.renameWorkspace !== undefined) {
											props.renameWorkspace(dialog.target, next).catch((reason) =>
												notify(`重命名失败：${reason instanceof Error ? reason.message : String(reason)}`)
											);
										}
									}
								},
								"保存"
							)
						)
					);
				}
				const dialogNode = h(
					"div",
					{ className: "wg-overlay", onMouseDown: (event) => { if (event.target === event.currentTarget) close(); } },
					h("div", { className: "wg-dialog" }, h("div", { className: "wg-dialog-title" }, dialog.title), body)
				);
				if (reactDom !== null && typeof reactDom.createPortal === "function") {
					return reactDom.createPortal(dialogNode, document.body);
				}
				return dialogNode;
			};

			// ---- compact rail ----
			if (!wide) {
				return h(
					"div",
					{ className: "wg-rail" },
					sections.map((section) =>
						h(
							"button",
							{
								key: `rail-${section.id}`,
								type: "button",
								className: "wg-rail-group",
								title: `${section.name}（${section.members.length}）`,
								onClick: () => {
									if (typeof props.expandSidebar === "function") props.expandSidebar();
									actions.setGroupCollapsed(section.id, false);
								}
							},
							IconFolderOpen(20)
						)
					)
				);
			}

			const creatingRow =
				creating === null
					? null
					: h(
							"div",
							{ key: "creating", className: "wg-group-row" },
							h("span", { className: "wg-chev wg-chev-open" }),
							h("span", { className: "wg-folder" }, IconFolderClose(16)),
							h("input", {
								className: "wg-input",
								autoFocus: true,
								placeholder: "分区名称",
								defaultValue: creating.value,
								onClick: stop,
								onBlur: (event) => {
									if (event.currentTarget.value.trim() !== "") commitCreate(event.currentTarget.value);
									else setCreating(null);
								},
								onKeyDown: (event) => {
									if (event.key === "Enter") commitCreate(event.currentTarget.value);
									if (event.key === "Escape") setCreating(null);
								}
							})
						);

			return h(
				"div",
				{ className: "wg-root" },
				h(
					"div",
					{ className: "wg-header" },
					h("span", { className: "wg-header-title" }, groupBy === "flat" ? "会话" : "工作区"),
					h(
						"div",
						{ className: "wg-header-actions" },
						h(
							"button",
							{
								type: "button",
								className: "wg-iconbtn",
								title: "新建分区",
								onClick: () => setCreating({ value: "" })
							},
							IconGroupAdd(16)
						),
						h(
							"button",
							{
								type: "button",
								className: "wg-iconbtn",
								title: "搜索",
								"aria-pressed": searchOpen,
								onClick: () => {
									if (searchOpen) {
										setSearch("");
										setSearchOpen(false);
									} else {
										setSearchOpen(true);
									}
								}
							},
							IconSearch(16)
						),
						h(NativeViewMenu, {
							groupBy,
							orderBy,
							archivedFilter,
							onGroup: (mode) => actions.setGroupBy(mode),
							onOrder: (mode) => actions.setOrderBy(mode),
							onArchived: (mode) => actions.setArchivedFilter(mode)
						}),
						props.hasDirectoryFlow === true || props.createWorkspace !== undefined
							? h(
									"button",
									{ type: "button", className: "wg-iconbtn", title: "添加工作区", onClick: openAddWorkspace },
									IconAddFolder(16)
								)
							: null
					)
				),
				searchOpen
					? h(
							"div",
							{ className: "wg-search" },
							h("span", { className: "wg-search-icon" }, IconSearch(14)),
							h("input", {
								className: "wg-search-input",
								autoFocus: true,
								placeholder: "搜索会话名称",
								"aria-label": "搜索会话",
								value: search,
								onChange: (event) => setSearch(event.currentTarget.value),
								onKeyDown: (event) => {
									if (event.key === "Escape") {
										setSearch("");
										setSearchOpen(false);
									}
								}
							}),
							search !== ""
								? h(
										"button",
										{ type: "button", className: "wg-iconbtn", title: "清除", onClick: () => setSearch("") },
										IconClose(12)
									)
								: null
						)
					: null,
				h(
					"div",
					{ className: "wg-list", role: "tree", "aria-label": searchActive ? "搜索结果" : groupBy === "flat" ? "会话" : "工作区" },
					searchActive ? null : creatingRow,
					searchActive
						? searchRows.items.length === 0 && !searchRows.pending
							? h("div", { className: "wg-empty" }, "无匹配会话")
							: [
									searchRows.items.map(renderSearchRow),
									searchRows.pending ? h("div", { key: "search-pending", className: "wg-empty" }, "正在搜索会话历史…") : null,
									searchRows.hasMore
										? h(
												"div",
												{ key: "search-more", className: "wg-empty" },
												`仅显示前 ${typeof props.searchResultLimit === "number" ? props.searchResultLimit : 20} 条结果，请缩小搜索范围。`
											)
										: null
								]
						: groupBy === "flat"
							? flatRows.length === 0
								? h("div", { className: "wg-empty" }, archivedFilter === "only" ? "暂无已归档会话" : "暂无会话")
								: flatRows.map(renderFlatRow)
							: sectionList.length === 0
								? h("div", { className: "wg-empty" }, "还没有工作区。点击右上角按钮添加一个目录。")
								: sectionList.map(renderSection)
				),
				menuContent(),
				dialogContent(),
				typeof props.renderSlot === "function"
					? (() => {
							try {
								return props.renderSlot("sidebar.workspaces.directoryFlow", wsFlowOwner);
							} catch (error) {
								console.warn(LOG_PREFIX, "directory flow render failed", error);
								return null;
							}
						})()
					: null,
				toast === "" ? null : h("div", { className: "wg-toast" }, toast)
			);
		}
		//#endregion

		//#region plugin
		const SLOT = "sidebar.workspaces";
		// `single` slots keep only the first entry (entriesOfSlot dedupes on an undefined key),
		// and register() sorts single-slot entries by `priority` ascending. A very low priority
		// therefore seats this browser ahead of the built-in one without touching host internals.
		const PRIORITY = -10000;
		const inject = ["slots", "workspaces", "sessions", "uiWorkspace"];

		function apply(ctx) {
			ensureStyles();
			const workspaces = ctx.get("workspaces");
			const uiWorkspace = ctx.get("uiWorkspace");
			const sessions = ctx.get("sessions");

			const handle = createGroupHandle();
			const instance = handle.create();
			const storeHandle = { ...handle, create: () => instance };

			const searchSessions = async (query, signal) => {
				if (sessions === undefined || typeof sessions.search !== "function") return { items: [], hasMore: false };
				const result = await sessions.search(query, signal);
				if (!result || result.ok !== true) throw new Error(result && result.error ? result.error.message : "session search failed");
				return result.value;
			};

			// The native browser declares `sidebar.workspaces.directoryFlow` as its child;
			// because this plugin out-seats it on the single slot, that declaration would
			// vanish and the built-in directory pickers (browse/native) would have nowhere
			// to register. Declare it here so the native add-workspace flow still mounts.
			const directoryFlowSource = {
				getSnapshot: () => ctx.slots.entries("sidebar.workspaces.directoryFlow").length > 0,
				subscribe: (listener) => ctx.slots.subscribe("sidebar.workspaces.directoryFlow", listener)
			};

			const pickDirectory = async () => {
				let picker;
				try {
					picker = ctx.remote?.directoryPicker;
				} catch {
					picker = undefined;
				}
				if (picker === undefined || typeof picker.pick !== "function") throw new Error("no native directory picker");
				const path = await picker.pick();
				return typeof path === "string" ? path : null;
			};

			ctx.slots.inject(SLOT, () => {
				try {
					return ctx.slots.register(
				{
					name: SLOT,
					id: "workspace-groups",
					priority: PRIORITY,
					registrant: "dsh-workspace-groups",
					store: storeHandle,
					inject: () => ({
						startSession: (workspaceId, options) => uiWorkspace.startSession(workspaceId, options),
						openSession: (sessionId) => uiWorkspace.openSession(sessionId),
						archiveSession: (sessionId) => uiWorkspace.archiveSession(sessionId),
						createWorkspace: async (path) => workspaces.create({ path }),
						renameWorkspace: async (workspaceId, title) => workspaces.rename(workspaceId, title),
						deleteWorkspace: async (workspaceId) => workspaces.delete(workspaceId),
						pickDirectory,
						searchSessions,
						searchResultLimit: sessions !== undefined && typeof sessions.searchResultLimit === "number" ? sessions.searchResultLimit : 20,
						directoryFlowSource,
						hasDirectoryFlow: ctx.slots.entries("sidebar.workspaces.directoryFlow").length > 0
					})
				},
				GroupedWorkspaceBrowser
			);
				} catch (error) {
					console.error(LOG_PREFIX, "slot register failed", error);
					throw error;
				}
			});
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
