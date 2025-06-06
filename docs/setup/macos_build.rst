Building Firefox On macOS
=========================

This document will help you get set up to build Firefox on your own
computer. Getting set up can take a while - we need to download a
lot of bytes! Even on a fast connection, this can take ten to fifteen
minutes of work, spread out over an hour or two.

Requirements
------------

-  **Memory:** 4GB RAM minimum, 8GB+ recommended.
-  **Disk Space:** At least 30GB of free disk space.
-  **Operating System:** macOS - most recent or prior release. It is advisable
   to upgrade to the latest “point” release.  See :ref:`build_hosts` for more
   information.


1. System preparation
---------------------

1.1. Install Brew
~~~~~~~~~~~~~~~~~

Mozilla's source tree requires a number of third-party tools.
You will need to install `Homebrew <https://brew.sh/>`__ so that we
can automatically fetch the tools we need.

1.2. Install Xcode
~~~~~~~~~~~~~~~~~~

Install Xcode from the App Store.
Once done, finalize the installation in your terminal:

.. code-block:: shell

    sudo xcode-select --switch /Applications/Xcode.app
    sudo xcodebuild -license

2. Bootstrap a copy of the Firefox source code
----------------------------------------------

Now that your system is ready, we can download the source code and have Firefox
automatically download the other dependencies it needs. The below command
will download a lot of data (years of Firefox history!) then guide you through
the interactive setup process.

.. code-block:: shell

    curl -L https://raw.githubusercontent.com/mozilla-firefox/firefox/refs/heads/main/python/mozboot/bin/bootstrap.py -O
    python3 bootstrap.py

Choosing a build type
~~~~~~~~~~~~~~~~~~~~~

If you aren't modifying the Firefox backend, then select one of the
:ref:`Artifact Mode <Understanding Artifact Builds>` options. If you are
building Firefox for Android, you should also see the :ref:`GeckoView Contributor Guide <geckoview-contributor-guide>`.

3. Build and Run
----------------

Now that your system is bootstrapped, you should be able to build!

.. code-block:: shell

    cd firefox
    git pull
    ./mach build

🎉 Congratulations! You've built your own home-grown Firefox!
You should see the following message in your terminal after a successful build:

.. code-block:: console

    Your build was successful!
    To take your build for a test drive, run: |mach run|
    For more information on what to do now, see https://firefox-source-docs.mozilla.org/setup/contributing_code.html

You can now use the ``./mach run`` command to run your locally built Firefox!

If your build fails, please reference the steps in the `Troubleshooting section <#troubleshooting>`_.

Signing
~~~~~~~

Code signing your Mac build is not required for local testing and is rarely
needed for development. The way Firefox is signed does impact functionality
such as passkey support so it is required in some cases. Generating a build as
close to a production build as possible requires code signing.
See :ref:`Signing Local macOS Builds` for more information.

Running outside the development environment
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

To test your changes on another macOS system (or to keep that particular Firefox around after new builds), you can't just use the generated application bundle (``obj-*/dist/Nightly[Debug].app``), since it contains symbolic links to other built libraries. Instead, build a distributable disk image with:

.. code-block:: shell

   ./mach package

Copy the resulting ``.dmg`` file from ``obj-*/dist/`` to the target system,
then double-click it as usual to find an ``.app`` bundle containing all
dependencies.

On Apple Silicon Macs, you will need to sign the build for this to work using
:ref:`Signing Local macOS Builds`.

Once the build has been copied to the target system, open it with
right-click->Open. The build will not launch by default because it is not
notarized. In addition to code signing, notarization is required on macOS
10.15+ for a downloaded app to be launchable by double clicking the app in
Finder.

Now the fun starts
------------------

Time to start hacking! You should join us on `Matrix <https://chat.mozilla.org/>`_,
say hello in the `Introduction channel
<https://chat.mozilla.org/#/room/#introduction:mozilla.org>`_, and `find a bug to
start working on <https://codetribute.mozilla.org/>`_.
See the :ref:`Firefox Contributors' Quick Reference` to learn how to test your changes,
send patches to Mozilla, update your source code locally, and more.

Troubleshooting
---------------

Build errors
~~~~~~~~~~~~

If you encounter a build error when trying to setup your development environment, please follow these steps:
   1. Copy the entire build error to your clipboard
   2. Paste this error to `gist.github.com <https://gist.github.com/>`__ in the text area
   3. Go to the `introduction channel <https://chat.mozilla.org/#/room/#introduction:mozilla.org>`__ and ask for help with your build error. Make sure to post the link to the gist.github.com snippet you created!

The CLOBBER file has been updated
~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

This is a normal error to encounter and tends to appear when working on a bug for a long period of time.
If you encounter this error, you need to run ``./mach clobber`` before running ``./mach build``.
Running ``./mach clobber`` will remove previous build artifacts to restart a build from scratch.
If you are using an artifact build, this will mean that the next build will take slightly longer than usual.
However, if you are using a non-artifact/full build, the next build will take significantly longer to complete.

Python-related errors
~~~~~~~~~~~~~~~~~~~~~

Building, running, testing, etc. not always support the latest Python versions, therefore it is possible to encounter Python-related errors,
especially after updating your Python distribution to a new version.

The recommended way to work around this is to use a virtual environment with a compatible Python version.
Please consider `mach's <https://searchfox.org/mozilla-central/source/mach>`_ ``MIN_PYTHON_VERSION`` and ``MAX_PYTHON_VERSION_TO_CONSIDER``
for the range of compatible versions.

Should you be using Python through Homebrew, you can install older releases like this:

.. code-block:: shell

   brew install python@3.<your-desired-version>

You can set up the virtual environment manually or use a supporting tool such as `pyenv <https://github.com/pyenv/pyenv>`_ (recommended).
Below is an example for manual setup.

.. code-block:: shell

   cd firefox
   # Creates virtual environment for <your-desired-version> in folder .venv
   python3.<your-desired-version> -m venv .venv
   # Activates virtual environment
   source .venv/bin/activate
