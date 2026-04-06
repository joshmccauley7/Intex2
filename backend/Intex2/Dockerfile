FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /app
COPY backend/Intex2/Intex2/*.csproj ./Intex2/
RUN dotnet restore ./Intex2/Intex2.csproj
COPY backend/Intex2/Intex2/ ./Intex2/
RUN dotnet publish ./Intex2/Intex2.csproj -c Release -o /out

FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=build /out .
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080
ENTRYPOINT ["dotnet", "Intex2.dll"]
