#-------------------------------------------------------------------------------------------------------------
# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See https://go.microsoft.com/fwlink/?linkid=2090316 for license information.
#-------------------------------------------------------------------------------------------------------------

  FROM phuquocvn/texlive

  ENV DEBIAN_FRONTEND=noninteractive
  RUN apt-get update \
      && apt-get -y install --no-install-recommends apt-utils 2>&1
  
  # https://nodejs.org/en/download/package-manager/#debian-and-ubuntu-based-linux-distributions
  # https://github.com/nodesource/distributions/blob/master/README.md#installation-instructions
  RUN apt -y install curl
  RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
  RUN apt-get install -y nodejs
  
  # Verify git and needed tools are installed
  RUN apt-get install --no-install-recommends -y git procps
  
  ENV DEBIAN_FRONTEND=dialog \
      LANG=C.UTF-8 \
      LC_ALL=C.UTF-8
  