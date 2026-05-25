@echo off
set PIP=C:\Users\baraa\interactive-learning-platform\backend\.venv\Scripts\pip.exe
set OPTS=--no-cache-dir --quiet

echo [1/10] fastapi uvicorn
%PIP% install %OPTS% fastapi "uvicorn[standard]"
echo [2/10] sqlalchemy alembic
%PIP% install %OPTS% sqlalchemy alembic
echo [3/10] pydantic pydantic-settings
%PIP% install %OPTS% pydantic pydantic-settings
echo [4/10] auth packages
%PIP% install %OPTS% PyJWT "passlib[bcrypt]" "bcrypt==4.0.1"
echo [5/10] groq huggingface-hub
%PIP% install %OPTS% groq huggingface-hub
echo [6/10] numpy scipy pillow matplotlib
%PIP% install %OPTS% "numpy<2.0" scipy Pillow matplotlib
echo [7/10] scikit-image
%PIP% install %OPTS% scikit-image
echo [8/10] httpx aiofiles
%PIP% install %OPTS% httpx aiofiles
echo [9/10] scikit-learn scikit-fuzzy
%PIP% install %OPTS% scikit-learn scikit-fuzzy
echo [10/10] tensorflow
%PIP% install %OPTS% tensorflow
echo DONE_ALL
