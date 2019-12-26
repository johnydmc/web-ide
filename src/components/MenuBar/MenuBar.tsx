import React, { useState } from "react";
import onClickOutside from "react-onclickoutside";
import { useSelector, useDispatch } from "react-redux";
import * as SS from "./styles";
import { MenuItemDef } from "./interfaces";
import { isMac } from "../../utils";
import {
    newDocument,
    saveFile,
    exportProject,
    addDocument
} from "../Projects/actions";
import { toggleManualPanel } from "../ProjectEditor/actions";
import { stopCsound, playPauseCsound, renderToDisk } from "../Csound/actions";
import { pathOr } from "ramda";
import { reduce } from "lodash";
import { getPlayActionFromTarget } from "../TargetControls/utils";
import { showKeyboardShortcuts } from "../SiteDocs/actions";

function MenuBar(props) {
    const activeProjectUid: string = useSelector(
        pathOr("", ["ProjectsReducer", "activeProjectUid"])
    );

    const dispatch = useDispatch();

    const playAction = useSelector(getPlayActionFromTarget);

    const menuBarItems: MenuItemDef[] = [
        {
            label: "File",
            submenu: [
                {
                    label: "New File…",
                    role: "creates new document",
                    keyBinding: isMac ? null : "ctrl+alt+n",
                    keyBindingLabel: isMac ? null : "ctrl+alt+n",
                    callback: () => dispatch(newDocument(activeProjectUid, ""))
                },
                {
                    label: "Add File…",
                    role: "add file from filesystem",
                    callback: () => dispatch(addDocument(activeProjectUid))
                },
                {
                    label: "Save Document",
                    keyBinding: isMac ? "alt+y" : "ctrl+s",
                    keyBindingLabel: isMac ? "⌘+s" : "ctrl+s",
                    callback: () => {
                        dispatch(saveFile());
                    },
                    role: "saveFile"
                },
                {
                    label: "Save All",
                    keyBinding: isMac ? "opt+cmd+s" : "ctrl+shift+s",
                    keyBindingLabel: isMac ? "⌥+⌘+s" : "ctrl+shift+s",
                    callback: () => {
                        dispatch(saveFile());
                    },
                    role: "saveAll"
                },
                {
                    role: "hr"
                },
                {
                    label: "Render to Disk and Download",
                    callback: () => dispatch(renderToDisk()),
                    role: "renderToDisk"
                },
                {
                    role: "hr"
                },
                {
                    label: "Close",
                    // keyBinding: isMac ? "⌘+s" : "ctrl+s",
                    role: "saveFile"
                },
                {
                    label: "Save and Close",
                    // keyBinding: isMac ? "⌘+s" : "ctrl+s",
                    role: "saveFile"
                },
                {
                    role: "hr"
                },
                {
                    label: "Export Project (.zip)",
                    callback: () => dispatch(exportProject()),
                    role: "export"
                }
            ]
        },
        {
            label: "Edit",
            submenu: [
                { label: "Undo", role: "doStuff" },
                { label: "Redo", role: "doStuff" }
            ]
        },
        {
            label: "Project",
            submenu: [
                {
                    label: "Configure",
                    role: "toggle-project-configure"
                }
            ]
        },
        {
            label: "Control",
            submenu: [
                {
                    label: "Run",
                    keyBinding: isMac ? "cmd+r" : "ctrl+r",
                    keyBindingLabel: isMac ? "⌘+r" : "ctrl+r",
                    role: "Run Csound",
                    callback: () => dispatch(playAction)
                },
                {
                    label: "Stop",
                    // keyBinding: isMac ? "cmd+." : "ctrl+.",
                    // keyBindingLabel: isMac ? "⌘+." : "ctrl+.",
                    // role: "doStuff",
                    callback: () => dispatch(stopCsound())
                },
                {
                    label: "Pause",
                    keyBinding: isMac ? "cmd+p" : "ctrl+p",
                    keyBindingLabel: isMac ? "⌘+p" : "ctrl+p",
                    role: "doStuff",
                    callback: () => dispatch(playPauseCsound())
                }
            ]
        },
        {
            label: "Help",
            submenu: [
                {
                    label: "Csound Manual",
                    role: "toggleManual",
                    callback: () => dispatch(toggleManualPanel())
                },
                {
                    label: "Csound Manual (External)",
                    role: "openCsoundManual",
                    callback: () => {
                        window.open("https://csound.com/docs/manual", "_blank");
                    }
                },
                {
                    label: "Csound FLOSS Manual",
                    role: "openCsoundFLOSSManual",
                    callback: () => {
                        window.open(
                            "https://csound-floss.firebaseapp.com/",
                            "_blank"
                        );
                    }
                },
                {
                    role: "hr"
                },
                {
                    label: "Web-IDE Documentation",
                    role: "open WebIDE Documentation",
                    callback: () => {
                        window.open("/documentation", "_blank");
                    }
                },
                {
                    role: "hr"
                },
                {
                    label: "Show Keyboard Shortcuts",
                    role: "showKeyboardShortcuts",
                    callback: () => dispatch(showKeyboardShortcuts())
                }
            ]
        }
    ];

    (MenuBar as any).handleClickOutside = evt => {
        setOpen(false);
    };

    const [open, setOpen] = useState(false) as any;

    function reduceRow(items, nesting) {
        return reduce(
            items,
            (acc, item) => {
                const index = acc.length;
                const keyBinding = item.keyBinding;
                const itemCallback = item.callback;

                if (item.role === "hr") {
                    acc.push(<hr key={index} css={SS.hr} />);
                } else if (keyBinding && itemCallback) {
                    acc.push(
                        <li
                            css={SS.listItem}
                            key={index}
                            onClick={() => itemCallback()}
                        >
                            <p css={SS.paraLabel}>{item.label}</p>
                            <span style={{ width: 24 }} />
                            <i css={SS.paraLabel}>{item.keyBindingLabel}</i>
                        </li>
                    );
                } else if (itemCallback) {
                    acc.push(
                        <li
                            css={SS.listItem}
                            key={index}
                            onClick={() => itemCallback()}
                        >
                            <p css={SS.paraLabel}>{item.label}</p>
                        </li>
                    );
                } else {
                    acc.push(
                        <li css={SS.listItem} key={index}>
                            <p css={SS.paraLabel}>{item.label}</p>
                        </li>
                    );
                }
                return acc;
            },
            [] as React.ReactNode[]
        );
    }

    const columns = reduce(
        menuBarItems,
        (acc, item) => {
            const index = acc.length;
            const row = (
                <ul
                    style={{ display: open === index ? "inline" : "none" }}
                    css={SS.dropdownList}
                >
                    {reduceRow(item.submenu, 0)}
                </ul>
            );
            acc.push(
                <li
                    css={SS.dropdownButton}
                    key={acc.length + open}
                    onClick={() =>
                        open !== false && index === open
                            ? setOpen(false)
                            : setOpen(index)
                    }
                    onMouseOver={() =>
                        open !== false && index !== open ? setOpen(index) : null
                    }
                >
                    {item.label}
                    {row}
                </li>
            );
            return acc;
        },
        [] as React.ReactNode[]
    );

    return (
        <>
            <ul css={SS.root}>{columns}</ul>
        </>
    );
}

const clickOutsideConfig = {
    excludeScrollbar: true,
    handleClickOutside: () => (MenuBar as any).handleClickOutside
};

// export default withShortcut(onClickOutside(MenuBar, clickOutsideConfig));
export default onClickOutside(MenuBar, clickOutsideConfig);
