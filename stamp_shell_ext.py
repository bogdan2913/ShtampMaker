"""
COM Shell Extension — обработчик контекстного меню Проводника.

Реализует IShellExtInit + IContextMenu.
Explorer передаёт все выделенные файлы через IDataObject сразу,
без лишних процессов и гонок по времени.
"""
import sys
import subprocess
import pythoncom
from win32com.shell import shell, shellcon
import win32con
import win32gui
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent
CLSID = "{7C4E9A2B-5D1F-4E3C-8B7A-9D6E5F4A3C2B}"


class StampContextMenu:
    _reg_clsid_  = CLSID
    _reg_progid_ = "ShtampMaker.ContextMenu"
    _reg_desc_   = "Поставить штамп на PDF"
    _com_interfaces_ = [shell.IID_IShellExtInit, shell.IID_IContextMenu]
    _public_methods_ = []

    def __init__(self):
        self._files = []

    # ── IShellExtInit.Initialize ───────────────────────────────────────────
    # Вызывается один раз со всеми выделенными файлами через IDataObject.

    def Initialize(self, pidlFolder, pdtobj, hkeyProgID):
        if pdtobj is None:
            return
        try:
            fe     = (shellcon.CF_HDROP, None, pythoncom.DVASPECT_CONTENT, -1, pythoncom.TYMED_HGLOBAL)
            medium = pdtobj.GetData(fe)
            files  = shell.DragQueryFile(medium.data_handle, -1)
            self._files = [f for f in files if f.lower().endswith(".pdf")]
        except Exception:
            self._files = []

    # ── IContextMenu ───────────────────────────────────────────────────────

    def QueryContextMenu(self, hMenu, indexMenu, idCmdFirst, idCmdLast, uFlags):
        if not self._files or uFlags & shellcon.CMF_DEFAULTONLY:
            return 0
        win32gui.InsertMenu(
            hMenu, indexMenu,
            win32con.MF_BYPOSITION | win32con.MF_STRING,
            idCmdFirst,
            "Поставить штамп",
        )
        return 1  # количество добавленных пунктов

    def InvokeCommand(self, ci):
        if not self._files:
            return
        exe = SCRIPT_DIR / "stamp_pdf.exe"
        if exe.exists():
            subprocess.Popen([str(exe)] + self._files)
        else:
            _exe = Path(sys.executable)
            pythonw = _exe.parent / _exe.name.replace("python", "pythonw")
            python = str(pythonw) if pythonw.exists() else sys.executable
            subprocess.Popen([python, str(SCRIPT_DIR / "stamp_pdf.py")] + self._files)

    def GetCommandString(self, idCmd, uType):
        if uType & shellcon.GCS_HELPTEXT:
            return "Поставить штамп на первую страницу PDF"
        raise pythoncom.com_error(-2147467263)  # E_NOTIMPL
