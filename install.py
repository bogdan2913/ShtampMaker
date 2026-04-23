"""
Установка / удаление COM-расширения контекстного меню «Поставить штамп».

Запуск из виртуального окружения:
    python install.py             # установить
    python install.py --uninstall # удалить

Права администратора не нужны — используется HKCU.
"""

import sys
import ctypes
import winreg
import glob as _glob
from pathlib import Path

SCRIPT_DIR = Path(__file__).parent.resolve()
CLSID = "{7C4E9A2B-5D1F-4E3C-8B7A-9D6E5F4A3C2B}"

# pythonw.exe — запуск без консольного окна
_exe = Path(sys.executable)
_pythonw = _exe.parent / _exe.name.replace("python", "pythonw")
PYTHON = str(_pythonw) if _pythonw.exists() else sys.executable


def _find_pythoncom_dll() -> str:
    """Ищет pythoncomXX.dll рядом с текущим интерпретатором."""
    ver = f"{sys.version_info.major}{sys.version_info.minor}"
    pattern = str(Path(sys.executable).parent / f"pythoncom{ver}.dll")
    matches = _glob.glob(pattern)
    if matches:
        return matches[0]
    # fallback: попробуем без точной версии
    for p in Path(sys.executable).parent.glob("pythoncom*.dll"):
        return str(p)
    raise FileNotFoundError("pythoncom*.dll не найден рядом с интерпретатором")


def _notify_shell():
    ctypes.windll.shell32.SHChangeNotify(0x08000000, 0x0000, None, None)


# Registry paths
_CLSID_KEY      = rf"Software\Classes\CLSID\{CLSID}"
_INPROC_KEY     = _CLSID_KEY + r"\InprocServer32"
_HANDLER_KEY    = r"Software\Classes\SystemFileAssociations\.pdf\shellex\ContextMenuHandlers\StampPDF"
# old simple-verb key (remove if present from previous installs)
_OLD_VERB_KEY   = r"Software\Classes\SystemFileAssociations\.pdf\shell\StampPDF"
_OLD_CMD_KEY    = _OLD_VERB_KEY + r"\command"


def install():
    pythoncom_dll = _find_pythoncom_dll()

    # 1. Register the COM class
    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, _CLSID_KEY) as k:
        winreg.SetValueEx(k, "", 0, winreg.REG_SZ, "ShtampMaker ContextMenu")

    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, _INPROC_KEY) as k:
        winreg.SetValueEx(k, "",            0, winreg.REG_SZ, pythoncom_dll)
        winreg.SetValueEx(k, "PythonClass", 0, winreg.REG_SZ, "stamp_shell_ext.StampContextMenu")
        winreg.SetValueEx(k, "PythonPath",  0, winreg.REG_SZ, str(SCRIPT_DIR))
        winreg.SetValueEx(k, "ThreadingModel", 0, winreg.REG_SZ, "Apartment")

    # 2. Register as a context menu handler for .pdf files
    with winreg.CreateKeyEx(winreg.HKEY_CURRENT_USER, _HANDLER_KEY) as k:
        winreg.SetValueEx(k, "", 0, winreg.REG_SZ, CLSID)

    # 3. Remove old simple-verb registration if present
    for key in (_OLD_CMD_KEY, _OLD_VERB_KEY):
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key)
        except FileNotFoundError:
            pass

    _notify_shell()

    print("Установлено (COM-расширение).")
    print(f"  CLSID       : {CLSID}")
    print(f"  pythoncom   : {pythoncom_dll}")
    print(f"  PythonPath  : {SCRIPT_DIR}")
    print()
    print("Если пункт не появился — перезапустите Проводник:")
    print("  taskkill /f /im explorer.exe && start explorer.exe")


def uninstall():
    removed = False
    for key in (_HANDLER_KEY, _INPROC_KEY, _CLSID_KEY, _OLD_CMD_KEY, _OLD_VERB_KEY):
        try:
            winreg.DeleteKey(winreg.HKEY_CURRENT_USER, key)
            removed = True
        except FileNotFoundError:
            pass

    _notify_shell()
    print("Удалено." if removed else "Расширение не было установлено.")


if __name__ == "__main__":
    if "--uninstall" in sys.argv:
        uninstall()
    else:
        install()
