from girder.plugin import getPlugin, GirderPlugin
from girder.api import access
from girder.models.user import User
from girder.api.describe import Description, autoDescribeRoute
from girder.constants import AccessType
from girder.api.v1.collection import Collection
from .utils import get_item_assignment


@access.public
@autoDescribeRoute(
    Description('Get region assignment info for a given user.')
    .modelParam('id', 'The user ID', model='user', level=AccessType.READ)
    .errorResponse()
    .errorResponse('Read access was denied on the user.', 403)
)
def getUserAssignInfo(user):
    return get_item_assignment(user)


class NinjatoPlugin(GirderPlugin):
    DISPLAY_NAME = 'Girder Ninjato API'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        # add plugin loading logic here
        getPlugin('jobs').load(info)
        # attach API route to Girder
        info['apiRoot'].user.route('GET', (':id', 'assignment'), getUserAssignInfo)
