# Third-party components · DAW Bridge GOD MODE 4.2

DAW Bridge installs (it does not vendor the package source in this ZIP) these Python dependencies through `requirements.txt`:

- **PyFLP 2.2.1** by demberto — GPL-3.0. Required for FL Studio binary project read and limited tempo-copy support. See <https://github.com/demberto/PyFLP> and the license shipped with PyFLP. Review GPL obligations before redistributing a combined application or its dependencies; this notice is not legal advice.
- **NumPy** — see the license and notices in its installed distribution: <https://numpy.org/license/>.
- **SoundFile** — see its license/notices and the libsndfile license for the platform-specific binary: <https://github.com/bastibe/python-soundfile>.
- **psutil** — BSD-3-Clause; see <https://github.com/giampaolo/psutil>.

The ZIP includes DAW Bridge source and `requirements.txt`; it does not include a copy of the PyFLP or NumPy package source. Dependency licenses and versions may change only if `requirements.txt` is deliberately updated.
